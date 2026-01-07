import { AnthropicMessage } from '../types/anthropicMessage';
import { ModelConfig, Provider } from '../types/config';
import { OpenAIMessage } from '../types/openaiMessage';
import { ChatMessage, Session } from '../types/session';
import { StreamCallbacks, StreamResult } from '../types/streamCallbacks';
import { ToolFilter } from '../types/tool';
import { buildAnthropicRequest } from './anthropicRequestBuilder';
import { AnthropicStreamHandler } from './anthropicStreamHandler';
import { getCurrentModel } from './configManager';
import { appendTokenUsage } from './costAnalysis';
import { saveRequest } from './diagnostic';
import { buildOpenAIRequest } from './openaiRequestBuilder';
import { OpenAIStreamHandler } from './openaiStreamHandler';
import { addToolResultMessages, getLastAssistantToolCalls } from './sessionManager';
import { executeTool } from './toolExecutor';

async function streamAIResponse(
  model: ModelConfig,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
  toolFilter?: ToolFilter,
  isFromAgent?: boolean,
  skipSystemPrompt?: boolean,
  sessionId?: string,
): Promise<StreamResult<ChatMessage>> {
  const {headers, body} = model.provider === 'openai'
    ? await buildOpenAIRequest(model, messages as OpenAIMessage[], toolFilter, skipSystemPrompt)
    : await buildAnthropicRequest(
      model,
      messages as AnthropicMessage[],
      toolFilter,
      skipSystemPrompt,
      sessionId,
    );

  saveRequest(model.provider, headers, body, isFromAgent);

  const handler = model.provider === 'openai'
    ? new OpenAIStreamHandler(callbacks)
    : new AnthropicStreamHandler(callbacks);

  return handler.stream(headers, body, model.apiUrl, signal);
}

async function processToolCalls(
  session: Session,
  provider: Provider,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<{session: Session; shouldContinue: boolean;}> {
  const toolCalls = getLastAssistantToolCalls(session, provider);

  if (toolCalls.length === 0 || signal?.aborted) {
    return {session, shouldContinue: false};
  }

  const toolResults: {toolCallId: string; content: string;}[] = [];

  for (const toolCall of toolCalls) {
    if (signal?.aborted) {
      break;
    }

    callbacks.onToolCall({id: toolCall.id, name: toolCall.name, input: toolCall.input});

    const result = await executeTool(toolCall.name, toolCall.input, signal);
    const content = JSON.stringify(result);
    callbacks.onToolResult({id: toolCall.id, name: toolCall.name, content});
    toolResults.push({toolCallId: toolCall.id, content});
  }

  if (signal?.aborted) {
    callbacks.onError?.('Tool execution interrupted');
  }
  return {
    session: addToolResultMessages(session, toolResults, provider),
    shouldContinue: !signal?.aborted,
  };
}

const noopCallbacks: StreamCallbacks = {
  onContent: () => {},
  onThinking: () => {},
  onToolCall: () => {},
  onToolResult: () => {},
};

export async function runConversation(
  session: Session,
  callbacks?: StreamCallbacks,
  signal?: AbortSignal,
  toolFilter?: ToolFilter,
  preferredModel?: ModelConfig,
  isFromAgent?: boolean,
  skipSystemPrompt?: boolean,
): Promise<Session> {
  let currentSession = session;
  const finalCallbacks = callbacks ?? noopCallbacks;
  const model = preferredModel ?? getCurrentModel();
  if (!model) {
    throw new Error('Cannot run conversation without a configured model');
  }

  while (true) {
    let result: StreamResult<ChatMessage>;

    try {
      result = await streamAIResponse(
        model,
        currentSession.messages,
        finalCallbacks,
        signal,
        toolFilter,
        isFromAgent,
        skipSystemPrompt,
        currentSession.id,
      );
    } catch (error) {
      const errorText = `${error}`;
      finalCallbacks.onError?.(errorText);
      return currentSession;
    }

    currentSession = {
      ...currentSession,
      messages: [...currentSession.messages, result.message],
      updatedAt: Date.now(),
      inputTokens: result.tokenUsage.inputTokens,
      outputTokens: result.tokenUsage.outputTokens,
      cachedTokens: result.tokenUsage.cacheReadTokens,
    };

    appendTokenUsage(currentSession.id, model.id, result.tokenUsage);

    finalCallbacks.onSessionUpdate?.(currentSession);

    const {session: updatedSession, shouldContinue} = await processToolCalls(
      currentSession,
      model.provider,
      finalCallbacks,
      signal,
    );
    currentSession = updatedSession;

    if (!shouldContinue) {
      return currentSession;
    }
  }
}
