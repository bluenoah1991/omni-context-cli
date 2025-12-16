import { AnthropicContentBlock, AnthropicMessage } from '../types/anthropicMessage';
import { AppConfig } from '../types/config';
import { OpenAIMessage } from '../types/openaiMessage';
import { ChatMessage, Session } from '../types/session';
import { ToolCall } from '../types/streamCallbacks';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateSessionTitle(firstMessage: string): string {
  const maxLength = 30;

  return firstMessage.length <= maxLength
    ? firstMessage
    : firstMessage.substring(0, maxLength) + '...';
}

export function createSession(): Session {
  const now = Date.now();

  return {id: generateId(), title: 'New Chat', messages: [], createdAt: now, updatedAt: now};
}

export function addUserMessage(
  session: Session,
  content: string,
  provider: AppConfig['provider'],
): Session {
  let message: ChatMessage;

  if (provider === 'openai') {
    message = {role: 'user', content} as OpenAIMessage;
  } else {
    const contentBlocks: AnthropicContentBlock[] = [];

    if (content) {
      contentBlocks.push({type: 'text', text: content});
    }

    message = {role: 'user', content: contentBlocks} as AnthropicMessage;
  }

  const isFirstMessage = session.messages.length === 0;
  const title = isFirstMessage ? generateSessionTitle(content) : session.title;

  return {...session, title, messages: [...session.messages, message], updatedAt: Date.now()};
}

export function addAssistantMessage(
  session: Session,
  content: string,
  provider: AppConfig['provider'],
): Session {
  const message: ChatMessage = provider === 'openai'
    ? ({role: 'assistant', content} as OpenAIMessage)
    : ({role: 'assistant', content: [{type: 'text', text: content}]} as AnthropicMessage);

  return {...session, messages: [...session.messages, message], updatedAt: Date.now()};
}

export function getLastAssistantToolCalls(
  session: Session,
  provider: AppConfig['provider'],
): ToolCall[] {
  const lastMessage = session.messages[session.messages.length - 1];

  if (lastMessage.role !== 'assistant') {
    return [];
  }

  if (provider === 'openai') {
    const openaiMessage = lastMessage as OpenAIMessage;
    if (!openaiMessage.tool_calls || openaiMessage.tool_calls.length === 0) {
      return [];
    }

    return openaiMessage.tool_calls.map(tc => ({
      id: tc.id,
      name: tc.function.name,
      input: JSON.parse(tc.function.arguments),
    }));
  } else {
    const anthropicMessage = lastMessage as AnthropicMessage;
    if (typeof anthropicMessage.content === 'string') {
      return [];
    }
    return anthropicMessage.content.filter(block => block.type === 'tool_use').map((
      block: any,
    ) => ({id: block.id, name: block.name, input: block.input}));
  }
}

export function addToolResultMessages(
  session: Session,
  toolResults: Array<{toolCallId: string; content: string;}>,
  provider: AppConfig['provider'],
): Session {
  let toolResultMessages: ChatMessage[];

  if (provider === 'openai') {
    toolResultMessages = toolResults.map(result => {
      return {
        role: 'tool',
        content: result.content,
        tool_call_id: result.toolCallId,
      } as OpenAIMessage;
    });
  } else {
    toolResultMessages = [{
      role: 'user',
      content: toolResults.map(result => {
        return {
          type: 'tool_result' as const,
          tool_use_id: result.toolCallId,
          content: result.content,
        };
      }),
    } as AnthropicMessage];
  }

  return {
    ...session,
    messages: [...session.messages, ...toolResultMessages],
    updatedAt: Date.now(),
  };
}
