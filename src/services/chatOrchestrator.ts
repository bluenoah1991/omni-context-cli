import { AnthropicMessage } from '../types/anthropicMessage';
import { ModelConfig, Provider } from '../types/config';
import { GeminiMessage } from '../types/geminiMessage';
import { OpenAIMessage } from '../types/openaiMessage';
import { ChatMessage, Session } from '../types/session';
import { StreamCallbacks, StreamResult, ToolResult } from '../types/streamCallbacks';
import { ToolFilter } from '../types/tool';
import { buildAnthropicRequest } from './anthropicRequestBuilder';
import { AnthropicStreamHandler } from './anthropicStreamHandler';
import { getCurrentModel } from './configManager';
import { appendTokenUsage } from './costAnalysis';
import { saveRequest, saveResponse } from './diagnostic';
import { buildGeminiRequest } from './geminiRequestBuilder';
import { GeminiStreamHandler } from './geminiStreamHandler';
import { buildOpenAIRequest } from './openaiRequestBuilder';
import { OpenAIStreamHandler } from './openaiStreamHandler';
import { buildResponsesRequest } from './responsesRequestBuilder';
import { ResponsesStreamHandler } from './responsesStreamHandler';
import { addToolResultMessages, getLastAssistantToolCalls } from './sessionManager';
import { requiresApproval } from './toolApproval';
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
  useDefaultTtl?: boolean,
): Promise<StreamResult<ChatMessage>> {
  let headers: Record<string, string>;
  let body: Record<string, unknown>;
  let handler;

  if (model.provider === 'responses') {
    const result = await buildResponsesRequest(
      model,
      messages,
      toolFilter,
      skipSystemPrompt,
      sessionId,
      isFromAgent,
    );
    headers = result.headers;
    body = result.body;
    handler = new ResponsesStreamHandler(callbacks);
  } else if (model.provider === 'gemini') {
    const result = await buildGeminiRequest(
      model,
      messages as GeminiMessage[],
      toolFilter,
      skipSystemPrompt,
      isFromAgent,
    );
    headers = result.headers;
    body = result.body;
    handler = new GeminiStreamHandler(callbacks);
  } else if (model.provider === 'openai') {
    const result = await buildOpenAIRequest(
      model,
      messages as OpenAIMessage[],
      toolFilter,
      skipSystemPrompt,
      isFromAgent,
    );
    headers = result.headers;
    body = result.body;
    handler = new OpenAIStreamHandler(callbacks);
  } else {
    const result = await buildAnthropicRequest(
      model,
      messages as AnthropicMessage[],
      toolFilter,
      skipSystemPrompt,
      sessionId,
      isFromAgent,
      useDefaultTtl,
    );
    headers = result.headers;
    body = result.body;
    handler = new AnthropicStreamHandler(callbacks);
  }

  const requestId = saveRequest(model.provider, body, isFromAgent);

  const result = await handler.stream(headers, body, model, signal);
  saveResponse(requestId, result);
  return result;
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

  const toolResults: ToolResult[] = [];

  const executedIds = new Set<string | undefined>();
  let userRejected = false;

  for (const toolCall of toolCalls) {
    if (signal?.aborted || userRejected) {
      break;
    }

    if (callbacks.onToolApproval && requiresApproval(toolCall.name)) {
      const approved = await callbacks.onToolApproval(toolCall);
      if (!approved) {
        userRejected = true;
        break;
      }
    }

    callbacks.onToolCall?.({id: toolCall.id, name: toolCall.name, input: toolCall.input});

    const result = await executeTool(toolCall.name, toolCall.input, signal, callbacks);
    const {dataUrl, ...resultWithoutDataUrl} = result;
    const content = JSON.stringify(resultWithoutDataUrl);
    callbacks.onToolResult?.({id: toolCall.id, name: toolCall.name, content});
    toolResults.push({id: toolCall.id, name: toolCall.name, content, dataUrl});
    executedIds.add(toolCall.id);
  }

  if (signal?.aborted || userRejected) {
    for (const toolCall of toolCalls) {
      if (!executedIds.has(toolCall.id)) {
        const content = JSON.stringify({success: false, error: 'Execution interrupted'});
        toolResults.push({id: toolCall.id, name: toolCall.name, content});
      }
    }
    callbacks.onError?.('Tool execution interrupted');
  }

  return {
    session: addToolResultMessages(session, toolResults, provider),
    shouldContinue: !signal?.aborted && !userRejected,
  };
}

function shouldUseDefaultTtl(
  session: Session,
  model: ModelConfig,
  useDefaultTtl?: boolean,
): boolean {
  if (useDefaultTtl) return true;
  const contextLimit = (model.contextSize || 200) * 1024;
  const totalTokens = (session.inputTokens ?? 0) + (session.outputTokens ?? 0);
  return (totalTokens / contextLimit) >= 0.5;
}

export async function runConversation(
  session: Session,
  callbacks?: StreamCallbacks,
  signal?: AbortSignal,
  toolFilter?: ToolFilter,
  preferredModel?: ModelConfig,
  isFromAgent?: boolean,
  skipSystemPrompt?: boolean,
  useDefaultTtl?: boolean,
): Promise<Session> {
  let currentSession = session;
  const finalCallbacks = callbacks ?? {};
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
        shouldUseDefaultTtl(currentSession, model, useDefaultTtl),
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
