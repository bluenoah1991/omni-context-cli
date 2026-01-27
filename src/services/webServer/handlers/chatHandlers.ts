import http from 'node:http';
import { useIDEStore } from '../../../store/ideStore';
import { wrapDualMessage, wrapIDEContext } from '../../../utils/messagePreprocessor';
import { runConversation } from '../../chatOrchestrator';
import { generateSummary, injectSummary, shouldAutoCompact } from '../../compactionManager';
import { loadAppConfig } from '../../configManager';
import { generateMemory, injectMemory } from '../../memoryManager';
import { sessionMessagesToUI } from '../../messageConverter';
import { injectProjectInstructions } from '../../projectInstructionsManager';
import { addUserMessage, createSession, saveSession } from '../../sessionManager';
import { getAllSlashCommands, parseSlashCommand } from '../../slashManager';
import { WebSession } from '../../webSessionManager';
import {
  parseRequestBody,
  sendErrorResponse,
  sendJsonResponse,
  sendNoContentResponse,
  sendSseEvent,
  startSseStream,
} from '../httpUtils';

export async function handleChat(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  webSession: WebSession,
): Promise<boolean> {
  const body = await parseRequestBody(req).catch(() => null);
  if (body === null) {
    sendErrorResponse(res, 'Invalid request body', 400);
    return true;
  }

  const content = body.content as string;
  const images = body.images as Array<{base64: string; mediaType: string;}> | undefined;

  if (!content) {
    sendErrorResponse(res, 'Missing content', 400);
    return true;
  }

  if (!webSession.currentModel) {
    sendErrorResponse(res, 'No model selected', 400);
    return true;
  }

  if (!webSession.chatSession) {
    webSession.chatSession = createSession();
  }

  const model = webSession.currentModel;
  let session = webSession.chatSession;

  startSseStream(res);

  const controller = new AbortController();
  webSession.abortController = controller;

  req.on('close', () => {
    controller.abort();
    webSession.abortController = null;
  });

  let text = content;
  const slashCommand = parseSlashCommand(text);

  if (slashCommand) {
    if (slashCommand.type === 'functional' && slashCommand.execute) {
      sendSseEvent(res, 'message', {role: 'user', content, timestamp: Date.now()});
      const result = await slashCommand.execute(controller.signal);
      if (result.message) {
        sendSseEvent(res, 'message', {
          role: 'assistant',
          content: result.message,
          timestamp: Date.now(),
        });
      }
      sendSseEvent(res, 'done', {});
      res.end();
      return true;
    }

    if (slashCommand.type === 'prompt' && slashCommand.prompt) {
      text = wrapDualMessage(text, slashCommand.prompt);
    }
  }

  const config = loadAppConfig();
  const currentSelection = useIDEStore.getState().selection;
  if (config.ideContext && currentSelection) {
    text = wrapIDEContext(text, currentSelection);
  }

  const userMedia = images?.map(image => ({
    dataUrl: `data:${image.mediaType};base64,${image.base64}`,
    mimeType: image.mediaType,
  }));

  if (slashCommand?.name === 'compact' || shouldAutoCompact(model, session)) {
    sendSseEvent(res, 'message', {role: 'user', content, timestamp: Date.now()});
    sendSseEvent(res, 'compacting', {});
    try {
      const [summary, memory] = await Promise.all([
        generateSummary(model, session.messages, controller.signal),
        config.memoryEnabled
          ? generateMemory(model, session, controller.signal)
          : Promise.resolve(undefined),
      ]);

      if (controller.signal.aborted) {
        sendSseEvent(res, 'error', {error: 'Compaction cancelled'});
        res.end();
        return true;
      }

      session = createSession(model);
      if (config.memoryEnabled) {
        session = injectMemory(session, model.provider, memory);
      }
      session = injectProjectInstructions(session, model.provider);
      session = injectSummary(session, summary, model.provider);

      if (slashCommand?.name !== 'compact') {
        session = addUserMessage(session, text, model.provider, userMedia);
      }
      webSession.chatSession = session;
      sendSseEvent(res, 'session_updated', {
        id: session.id,
        title: session.title,
        provider: session.provider,
        messages: sessionMessagesToUI(session.messages, session.provider),
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        inputTokens: session.inputTokens ?? 0,
        outputTokens: session.outputTokens ?? 0,
        cachedTokens: session.cachedTokens ?? 0,
      });

      if (slashCommand?.name === 'compact') {
        sendSseEvent(res, 'done', {
          id: session.id,
          title: session.title,
          provider: session.provider,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          inputTokens: session.inputTokens ?? 0,
          outputTokens: session.outputTokens ?? 0,
          cachedTokens: session.cachedTokens ?? 0,
        });
        res.end();
        return true;
      }
    } catch (error) {
      sendSseEvent(res, 'error', {error: `Compaction failed: ${error}`});
      res.end();
      return true;
    }
  } else {
    if (session.messages.length === 0) {
      if (config.memoryEnabled) {
        session = injectMemory(session, model.provider);
      }
      session = injectProjectInstructions(session, model.provider);
    }
    session = addUserMessage(session, text, model.provider, userMedia);
    webSession.chatSession = session;
    sendSseEvent(res, 'session_updated', {
      id: session.id,
      title: session.title,
      provider: session.provider,
      messages: sessionMessagesToUI(session.messages, session.provider),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      inputTokens: session.inputTokens ?? 0,
      outputTokens: session.outputTokens ?? 0,
      cachedTokens: session.cachedTokens ?? 0,
    });
  }

  const specialistMode = config.specialistMode ?? true;

  const toolFilter = {
    excludeAgents: !specialistMode,
    excludeMcp: specialistMode,
    allowedTools: specialistMode ? [] : null,
    additionalTools: specialistMode ? null : ['agent_explore'],
  };

  try {
    session = await runConversation(
      session,
      {
        onContent: (text: string) => {
          if (!res.writableEnded) {
            sendSseEvent(res, 'message', {role: 'assistant', content: text, timestamp: Date.now()});
          }
        },
        onThinking: (text: string) => {
          if (!res.writableEnded) {
            sendSseEvent(res, 'message', {role: 'thinking', content: text, timestamp: Date.now()});
          }
        },
        onToolCall: call => {
          if (!res.writableEnded) {
            sendSseEvent(res, 'message', {
              role: 'tool_call',
              content: JSON.stringify(call.input),
              timestamp: Date.now(),
              toolName: call.name,
              toolCallId: call.id,
            });
          }
        },
        onToolResult: result => {
          if (!res.writableEnded) {
            sendSseEvent(res, 'message', {
              role: 'tool_result',
              content: result.content || '',
              timestamp: Date.now(),
              toolName: result.name,
              toolCallId: result.id,
            });
          }
        },
        onError: (error: string) => {
          if (!res.writableEnded) {
            sendSseEvent(res, 'error', {error});
          }
        },
      },
      controller.signal,
      toolFilter,
      webSession.currentModel,
    );
    webSession.chatSession = session;
    saveSession(session);
    sendSseEvent(res, 'done', {
      id: session.id,
      title: session.title,
      provider: session.provider,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      inputTokens: session.inputTokens ?? 0,
      outputTokens: session.outputTokens ?? 0,
      cachedTokens: session.cachedTokens ?? 0,
    });
  } finally {
    webSession.abortController = null;
    res.end();
  }

  return true;
}

export function handleGetIDEContext(res: http.ServerResponse): boolean {
  const selection = useIDEStore.getState().selection;
  if (!selection) {
    sendNoContentResponse(res);
    return true;
  }
  sendJsonResponse(res, {
    path: selection.filePath,
    content: selection.text,
    lineStart: selection.lineStart,
    lineEnd: selection.lineEnd,
  });
  return true;
}

const EXCLUDED_SLASH_COMMANDS = ['exit', 'model', 'session'];

export function handleGetSlashCommands(res: http.ServerResponse): boolean {
  const commands = getAllSlashCommands().filter(command =>
    !EXCLUDED_SLASH_COMMANDS.includes(command.name)
  ).map(command => ({name: command.name, description: command.description, type: command.type}));
  sendJsonResponse(res, commands);
  return true;
}

export function handleStopGeneration(res: http.ServerResponse, webSession: WebSession): boolean {
  if (webSession.abortController) {
    webSession.abortController.abort();
  }
  sendJsonResponse(res, {ok: true});
  return true;
}
