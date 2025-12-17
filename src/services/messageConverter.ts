import { AnthropicMessage } from '../types/anthropicMessage';
import { OpenAIMessage } from '../types/openaiMessage';
import { PendingToolCall } from '../types/tool';
import { UIMessage } from '../types/uiMessage';

function openAIMessageToUI(
  message: OpenAIMessage,
  timestamp: number,
  pendingToolCalls: Map<string, PendingToolCall>,
): UIMessage[] {
  const uiMessages: UIMessage[] = [];

  switch (message.role) {
    case 'user': {
      if (typeof message.content === 'string') {
        if (message.content.trim()) {
          uiMessages.push({role: 'user', content: message.content, timestamp});
        }
      } else if (Array.isArray(message.content)) {
        const textParts = message.content.filter(part => part.type === 'text').map(part =>
          part.text
        );
        if (textParts.length > 0) {
          const content = textParts.join('\n');
          if (content.trim()) {
            uiMessages.push({role: 'user', content, timestamp});
          }
        }
      }
      break;
    }

    case 'assistant': {
      if (message.reasoning_content && message.reasoning_content.trim()) {
        uiMessages.push({role: 'thinking', content: message.reasoning_content, timestamp});
      }

      if (typeof message.content === 'string') {
        if (message.content.trim()) {
          uiMessages.push({role: 'assistant', content: message.content, timestamp});
        }
      } else if (Array.isArray(message.content)) {
        const textParts = message.content.filter(part => part.type === 'text').map(part =>
          part.text
        );
        if (textParts.length > 0) {
          const content = textParts.join('\n');
          if (content.trim()) {
            uiMessages.push({role: 'assistant', content, timestamp});
          }
        }
      }

      if (message.tool_calls && message.tool_calls.length > 0) {
        message.tool_calls.forEach(toolCall => {
          pendingToolCalls.set(toolCall.id, {
            content: toolCall.function.arguments,
            timestamp,
            toolName: toolCall.function.name,
          });
        });
      }
      break;
    }

    case 'tool': {
      const toolCallId = message.tool_call_id ?? '';
      const pending = pendingToolCalls.get(toolCallId);
      if (pending) {
        pendingToolCalls.delete(toolCallId);
        let resultContent = '';
        if (typeof message.content === 'string') {
          resultContent = message.content;
        } else if (Array.isArray(message.content)) {
          resultContent = message.content.filter(part => part.type === 'text').map(part =>
            part.text
          ).join('\n');
        }
        uiMessages.push({
          role: 'tool_call',
          content: pending.content,
          timestamp: pending.timestamp,
          toolName: pending.toolName,
          toolCallId,
          toolResult: resultContent,
        });
      }
      break;
    }
  }

  return uiMessages;
}

function anthropicMessageToUI(
  message: AnthropicMessage,
  timestamp: number,
  pendingToolCalls: Map<string, PendingToolCall>,
): UIMessage[] {
  const uiMessages: UIMessage[] = [];

  if (typeof message.content === 'string') {
    if (message.content.trim()) {
      uiMessages.push({
        role: message.role === 'user' ? 'user' : 'assistant',
        content: message.content,
        timestamp,
      });
    }
    return uiMessages;
  }

  const thinkingBlocks = message.content.filter(block => block.type === 'thinking');
  if (thinkingBlocks.length > 0) {
    const content = thinkingBlocks.map(block => block.thinking).join('\n');
    if (content.trim()) {
      uiMessages.push({role: 'thinking', content, timestamp});
    }
  }

  const textBlocks = message.content.filter(block => block.type === 'text');
  if (textBlocks.length > 0) {
    const content = textBlocks.map(block => block.text).join('\n');
    if (content.trim()) {
      uiMessages.push({role: message.role === 'user' ? 'user' : 'assistant', content, timestamp});
    }
  }

  message.content.forEach(block => {
    if (block.type === 'tool_use') {
      pendingToolCalls.set(block.id, {
        content: JSON.stringify(block.input),
        timestamp,
        toolName: block.name,
      });
    } else if (block.type === 'tool_result') {
      const pending = pendingToolCalls.get(block.tool_use_id);
      if (pending) {
        pendingToolCalls.delete(block.tool_use_id);
        let resultContent = '';
        if (typeof block.content === 'string') {
          resultContent = block.content;
        } else {
          resultContent = block.content.filter(part => part.type === 'text').map(part => part.text)
            .join('\n');
        }
        uiMessages.push({
          role: 'tool_call',
          content: pending.content,
          timestamp: pending.timestamp,
          toolName: pending.toolName,
          toolCallId: block.tool_use_id,
          toolResult: resultContent,
        });
      }
    }
  });

  return uiMessages;
}

export function sessionMessagesToUI(
  messages: (OpenAIMessage | AnthropicMessage)[],
  provider: 'openai' | 'anthropic',
): UIMessage[] {
  const uiMessages: UIMessage[] = [];
  const pendingToolCalls = new Map<string, PendingToolCall>();

  messages.forEach((message, index) => {
    const timestamp = Date.now() - (messages.length - index) * 1000;

    if (provider === 'openai') {
      uiMessages.push(...openAIMessageToUI(message as OpenAIMessage, timestamp, pendingToolCalls));
    } else {
      uiMessages.push(
        ...anthropicMessageToUI(message as AnthropicMessage, timestamp, pendingToolCalls),
      );
    }
  });

  return uiMessages;
}
