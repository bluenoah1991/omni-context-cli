import * as acp from '@agentclientprotocol/sdk';
import { readFileSync } from 'node:fs';
import { Readable, Writable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import type { WorkflowPreset } from '../types/config.js';
import type { Session } from '../types/session.js';
import type { StreamCallbacks, ToolCall as OmxToolCall } from '../types/streamCallbacks.js';
import { isMediaPath, loadMediaAsBase64, parseDataUrl } from '../utils/mediaUtils.js';
import { wrapDualMessage, wrapFileContext } from '../utils/messagePreprocessor.js';
import { runConversation } from './chatOrchestrator.js';
import { generateSummary, injectSummary, shouldAutoCompact } from './compactionManager.js';
import {
  findModelById,
  getCurrentModel,
  loadAppConfig,
  setConfigOverride,
  setCurrentModel,
} from './configManager.js';
import { generateMemory, injectMemory } from './memoryManager.js';
import { injectProjectInstructions } from './projectInstructionsManager.js';
import { addUserMessage, createSession, saveSession } from './sessionManager.js';
import { getAllSlashCommands, parseSlashCommand } from './slashManager.js';
import { formatToolCall } from './toolExecutor.js';

const WORKFLOW_PRESETS: WorkflowPreset[] = [
  'specialist',
  'normal',
  'artist',
  'explorer',
  'assistant',
];

const MODE_DESCRIPTIONS: Record<WorkflowPreset, string> = {
  specialist: 'Agent mode with specialized sub-agents',
  normal: 'Direct mode with all tools available',
  artist: 'Image-first responses',
  explorer: 'Web search-focused',
  assistant: 'General assistant',
};

const EXCLUDED_COMMANDS = ['exit', 'model', 'session', 'clear', 'rewind'];

class OmxAgent implements acp.Agent {
  private connection: acp.AgentSideConnection;
  private sessions = new Map<string, Session>();
  private abortControllers = new Map<string, AbortController>();

  constructor(connection: acp.AgentSideConnection) {
    this.connection = connection;
  }

  async initialize(_params: acp.InitializeRequest): Promise<acp.InitializeResponse> {
    return {
      protocolVersion: acp.PROTOCOL_VERSION,
      agentCapabilities: {promptCapabilities: {image: true}},
    };
  }

  async newSession(_params: acp.NewSessionRequest): Promise<acp.NewSessionResponse> {
    const model = getCurrentModel();
    const sessionId = crypto.randomUUID();
    const session = this.createSessionWithId(sessionId, model);
    this.sessions.set(sessionId, session);
    const config = loadAppConfig();
    setTimeout(() => this.pushAvailableCommands(sessionId), 0);
    return {
      sessionId,
      modes: this.buildModeState(config.workflowPreset ?? 'specialist'),
      models: this.buildModelState(),
    };
  }

  async setSessionMode?(params: acp.SetSessionModeRequest): Promise<acp.SetSessionModeResponse> {
    const preset = params.modeId as WorkflowPreset;
    if (WORKFLOW_PRESETS.includes(preset)) {
      setConfigOverride('workflowPreset', preset);
    }
    return {};
  }

  async unstable_setSessionModel?(
    params: acp.SetSessionModelRequest,
  ): Promise<acp.SetSessionModelResponse> {
    const model = findModelById(params.modelId);
    if (model) {
      setCurrentModel(model);
    }
    return {};
  }

  async authenticate(_params: acp.AuthenticateRequest): Promise<acp.AuthenticateResponse> {
    return {};
  }

  async prompt(params: acp.PromptRequest): Promise<acp.PromptResponse> {
    const sessionId = params.sessionId;
    const model = getCurrentModel();
    if (!model) {
      this.sendText(sessionId, 'No model configured. Run `omx` to set one up.');
      return {stopReason: 'end_turn'};
    }

    let session = this.sessions.get(sessionId);
    if (!session) {
      session = this.createSessionWithId(sessionId, model);
      this.sessions.set(sessionId, session);
    }

    const textParts: string[] = [];
    const fileRefs: Array<{name: string; content: string;}> = [];
    const media: Array<{dataUrl: string; mimeType: string;}> = [];

    for (const block of params.prompt) {
      if (block.type === 'text') {
        textParts.push((block as acp.TextContent & {type: 'text';}).text);
      } else if (block.type === 'image') {
        const img = block as acp.ImageContent & {type: 'image';};
        media.push({dataUrl: `data:${img.mimeType};base64,${img.data}`, mimeType: img.mimeType});
      } else if (block.type === 'resource_link') {
        const link = block as acp.ResourceLink & {type: 'resource_link';};
        const filePath = link.uri.startsWith('file://') ? fileURLToPath(link.uri) : link.uri;
        if (isMediaPath(filePath)) {
          const mediaData = loadMediaAsBase64(filePath);
          if (mediaData) {
            media.push(mediaData);
          }
        } else {
          try {
            fileRefs.push({name: link.name, content: readFileSync(filePath, 'utf-8')});
          } catch {
            fileRefs.push({name: link.name, content: '(unable to read)'});
          }
        }
      }
    }

    let text = textParts.join('\n');

    const controller = new AbortController();
    this.abortControllers.set(sessionId, controller);

    const slashCommand = parseSlashCommand(text);
    if (slashCommand) {
      if (slashCommand.type === 'functional' && slashCommand.execute) {
        const result = await slashCommand.execute(controller.signal);
        if (result.message) {
          this.sendText(sessionId, result.message);
        }
        this.abortControllers.delete(sessionId);
        return {stopReason: 'end_turn'};
      }
      if (slashCommand.type === 'prompt' && slashCommand.prompt) {
        text = wrapDualMessage(text, slashCommand.prompt);
      }
    }

    for (const ref of fileRefs) {
      text = wrapFileContext(text, ref.name, ref.content);
    }

    if (!text && media.length === 0) {
      this.abortControllers.delete(sessionId);
      return {stopReason: 'end_turn'};
    }

    try {
      const config = loadAppConfig();
      const isCompact = slashCommand?.name === 'compact';

      if (isCompact || shouldAutoCompact(model, session)) {
        const [summary, memory] = await Promise.all([
          generateSummary(model, session.messages, controller.signal),
          config.memoryEnabled
            ? generateMemory(model, session, controller.signal)
            : Promise.resolve(undefined),
        ]);

        if (controller.signal.aborted) {
          return {stopReason: 'cancelled'};
        }

        session = this.createSessionWithId(sessionId, model);
        if (config.memoryEnabled) {
          session = injectMemory(session, model.provider, memory);
        }
        session = injectProjectInstructions(session, model.provider);
        session = injectSummary(session, summary, model.provider);

        if (isCompact) {
          this.sessions.set(sessionId, session);
          saveSession(session);
          this.sendText(sessionId, 'Context compacted.');
          return {stopReason: 'end_turn'};
        }
      } else if (session.messages.length === 0) {
        if (config.memoryEnabled) {
          session = injectMemory(session, model.provider);
        }
        session = injectProjectInstructions(session, model.provider);
      }

      const userMedia = media.length > 0 ? media : undefined;
      session = addUserMessage(session, text, model.provider, userMedia);
      this.sessions.set(sessionId, session);

      const workflowPreset = config.workflowPreset ?? 'specialist';
      const toolFilter = {
        excludeAgents: workflowPreset !== 'specialist',
        excludeMcp: workflowPreset === 'specialist',
        allowedTools: workflowPreset === 'specialist' ? [] : null,
        additionalTools: workflowPreset === 'specialist' ? null : ['agent_explore'],
      };

      let idCounter = 0;
      let activeToolCallId = '';

      const callbacks: StreamCallbacks = {
        onContent: (content: string) => {
          this.sendText(sessionId, content);
        },
        onThinking: (thinking: string) => {
          this.connection.sessionUpdate({
            sessionId,
            update: {sessionUpdate: 'agent_thought_chunk', content: {type: 'text', text: thinking}},
          });
        },
        onToolCall: (call: OmxToolCall) => {
          activeToolCallId = call.id || activeToolCallId || `tool_${++idCounter}`;
          const toolCallId = activeToolCallId;
          const locations = this.extractLocations(call);
          this.connection.sessionUpdate({
            sessionId,
            update: {
              sessionUpdate: 'tool_call',
              toolCallId,
              title: formatToolCall(call.name, call.input),
              kind: this.mapToolKind(call.name),
              status: 'in_progress',
              locations,
              rawInput: call.input,
            },
          });
        },
        onToolResult: result => {
          const toolCallId = result.id || activeToolCallId;
          activeToolCallId = '';
          let rawOutput: Record<string, unknown>;
          let displayText: string;
          try {
            rawOutput = JSON.parse(result.content);
            displayText = rawOutput.error as string || rawOutput.displayText as string || 'Done';
          } catch {
            rawOutput = {result: result.content};
            displayText = result.content;
          }
          this.connection.sessionUpdate({
            sessionId,
            update: {
              sessionUpdate: 'tool_call_update',
              toolCallId,
              status: 'completed',
              content: [{type: 'content', content: {type: 'text', text: displayText}}],
              rawOutput,
            },
          });
        },
        onError: (error: string) => {
          this.sendText(sessionId, `Error: ${error}`);
        },
        onSessionUpdate: updatedSession => {
          this.sessions.set(sessionId, updatedSession);
        },
        onMedia: artifact => {
          const parsed = parseDataUrl(artifact.url);
          if (parsed) {
            this.connection.sessionUpdate({
              sessionId,
              update: {
                sessionUpdate: 'agent_message_chunk',
                content: {type: 'image', data: parsed.data, mimeType: parsed.mediaType},
              },
            });
          }
        },
      };

      session = await runConversation(session, callbacks, controller.signal, toolFilter, model);

      this.sessions.set(sessionId, session);
      saveSession(session);

      return {stopReason: controller.signal.aborted ? 'cancelled' : 'end_turn'};
    } finally {
      this.abortControllers.delete(sessionId);
    }
  }

  async cancel(params: acp.CancelNotification): Promise<void> {
    const controller = this.abortControllers.get(params.sessionId);
    controller?.abort();
  }

  private createSessionWithId(
    sessionId: string,
    model?: Parameters<typeof createSession>[0],
  ): Session {
    return {...createSession(model), id: sessionId};
  }

  private pushAvailableCommands(sessionId: string): void {
    const commands = getAllSlashCommands().filter(c => !EXCLUDED_COMMANDS.includes(c.name)).map(
      c => ({
        name: c.name,
        description: c.description,
        input: {type: 'unstructured' as const, hint: c.description},
      })
    );
    this.connection.sessionUpdate({
      sessionId,
      update: {sessionUpdate: 'available_commands_update', availableCommands: commands},
    });
  }

  private sendText(sessionId: string, text: string): void {
    this.connection.sessionUpdate({
      sessionId,
      update: {sessionUpdate: 'agent_message_chunk', content: {type: 'text', text}},
    });
  }

  private buildModeState(currentPreset: WorkflowPreset): acp.SessionModeState {
    return {
      availableModes: WORKFLOW_PRESETS.map(id => ({
        id,
        name: id[0].toUpperCase() + id.slice(1),
        description: MODE_DESCRIPTIONS[id],
      })),
      currentModeId: currentPreset,
    };
  }

  private buildModelState(): acp.SessionModelState {
    const config = loadAppConfig();
    const current = getCurrentModel();
    return {
      availableModels: config.models.map(m => ({
        modelId: m.id,
        name: m.nickname || m.name,
        description: m.source ? `${m.name} (${m.source})` : m.name,
      })),
      currentModelId: current?.id ?? '',
    };
  }

  private mapToolKind(toolName: string): acp.ToolKind {
    switch (toolName) {
      case 'Bash':
        return 'execute';
      case 'Edit':
      case 'Write':
        return 'edit';
      case 'Read':
        return 'read';
      case 'Grep':
      case 'Glob':
        return 'search';
      default:
        return 'other';
    }
  }

  private extractLocations(call: OmxToolCall): Array<{path: string;}> {
    const input = call.input;
    if (input.filePath) return [{path: input.filePath}];
    if (input.path) return [{path: input.path}];
    return [];
  }
}

export function startAcpAgent(): void {
  const output = Writable.toWeb(process.stdout) as WritableStream<Uint8Array>;
  const input = Readable.toWeb(process.stdin) as ReadableStream<Uint8Array>;
  const stream = acp.ndJsonStream(output, input);

  const connection = new acp.AgentSideConnection(conn => new OmxAgent(conn), stream);

  connection.signal.addEventListener('abort', () => {
    process.exit(0);
  });
}
