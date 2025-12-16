import { AnthropicMessage } from '../types/anthropicMessage';
import { AppConfig } from '../types/config';
import { OpenAIMessage } from '../types/openaiMessage';
import { ChatMessage, Session } from '../types/session';
import { StreamCallbacks } from '../types/streamCallbacks';
import { buildAnthropicRequest } from './anthropicRequestBuilder';
import { AnthropicStreamHandler } from './anthropicStreamHandler';
import { getAppConfig } from './configManager';
import { applyContextWindow } from './contextWindow';
import { saveRequest } from './diagnostic';
import { buildOpenAIRequest } from './openaiRequestBuilder';
import { OpenAIStreamHandler } from './openaiStreamHandler';
import {
  addAssistantMessage,
  addToolResultMessages,
  getLastAssistantToolCalls,
} from './sessionManager';
import { executeTool } from './toolExecutor';

async function streamAIResponse(
  config: AppConfig,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<ChatMessage> {
  const contextConfig = {maxTokens: (config.contextSize ?? 200) * 1024, usageRatio: 0.8};
  const {messages: windowedMessages} = applyContextWindow(messages, contextConfig);

  const {headers, body} = config.provider === 'openai'
    ? await buildOpenAIRequest(config, windowedMessages as OpenAIMessage[])
    : await buildAnthropicRequest(config, windowedMessages as AnthropicMessage[]);

  saveRequest(config.provider, headers, body);

  const handler = config.provider === 'openai'
    ? new OpenAIStreamHandler(callbacks)
    : new AnthropicStreamHandler(callbacks);

  return handler.stream(headers, body, config.apiUrl, signal);
}

async function processToolCalls(
  session: Session,
  provider: AppConfig['provider'],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<{session: Session; shouldContinue: boolean;}> {
  const toolCalls = getLastAssistantToolCalls(session, provider);

  if (toolCalls.length === 0 || signal?.aborted) {
    return {session, shouldContinue: false};
  }

  const toolResults = await Promise.all(toolCalls.map(async toolCall => {
    const result = await executeTool(toolCall.name, toolCall.input);
    const content = JSON.stringify(result);
    callbacks.onToolResult({id: toolCall.id, name: toolCall.name, content});
    return {toolCallId: toolCall.id, content};
  }));

  return {session: addToolResultMessages(session, toolResults, provider), shouldContinue: true};
}

export async function runConversation(
  session: Session,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<Session> {
  let currentSession = session;
  const config = getAppConfig();

  while (true) {
    let message: ChatMessage;

    try {
      message = await streamAIResponse(config, currentSession.messages, callbacks, signal);
    } catch (error) {
      const errorText = `${error}`;

      callbacks.onError?.(errorText);
      return addAssistantMessage(currentSession, errorText, config.provider);
    }

    const messageInputTokens = 'inputTokens' in message ? (message.inputTokens ?? 0) : 0;
    const messageOutputTokens = 'outputTokens' in message ? (message.outputTokens ?? 0) : 0;
    const messageCachedTokens = 'cachedTokens' in message ? (message.cachedTokens ?? 0) : 0;

    currentSession = {
      ...currentSession,
      messages: [...currentSession.messages, message],
      updatedAt: Date.now(),
      inputTokens: messageInputTokens,
      outputTokens: messageOutputTokens,
      cachedTokens: messageCachedTokens,
    };

    callbacks.onSessionUpdate?.(currentSession);

    const {session: updatedSession, shouldContinue} = await processToolCalls(
      currentSession,
      config.provider,
      callbacks,
      signal,
    );
    currentSession = updatedSession;

    if (!shouldContinue) {
      return currentSession;
    }
  }
}
