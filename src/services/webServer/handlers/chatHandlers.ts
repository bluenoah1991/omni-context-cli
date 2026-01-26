import http from 'node:http';
import { useIDEStore } from '../../../store/ideStore';
import { wrapIDEContext } from '../../../utils/messagePreprocessor';
import { runConversation } from '../../chatOrchestrator';
import { loadAppConfig } from '../../configManager';
import { injectMemory } from '../../memoryManager';
import { sessionMessagesToUI } from '../../messageConverter';
import { injectProjectInstructions } from '../../projectInstructionsManager';
import { addUserMessage, createSession, saveSession } from '../../sessionManager';
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
  session.provider = model.provider;
  session.modelId = model.id;

  startSseStream(res);

  const controller = new AbortController();
  webSession.abortController = controller;

  req.on('close', () => {
    controller.abort();
    webSession.abortController = null;
  });

  const config = loadAppConfig();
  const processedContent = wrapIDEContext(content, useIDEStore.getState().selection);

  const isNewSession = session.messages.length === 0;
  if (isNewSession) {
    if (config.memoryEnabled) {
      session = injectMemory(session, model.provider);
    }
    session = injectProjectInstructions(session, model.provider);

    const uiMessages = sessionMessagesToUI(session.messages, model.provider);
    uiMessages.forEach(message => sendSseEvent(res, 'message', message));
  }

  const media = images?.map(image => ({
    dataUrl: `data:${image.mediaType};base64,${image.base64}`,
    mimeType: image.mediaType,
  }));
  session = addUserMessage(session, processedContent, model.provider, media);
  webSession.chatSession = session;

  sendSseEvent(res, 'message', {role: 'user', content, timestamp: Date.now()});

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

export function handleStopGeneration(res: http.ServerResponse, webSession: WebSession): boolean {
  if (webSession.abortController) {
    webSession.abortController.abort();
  }
  sendJsonResponse(res, {ok: true});
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
