import { AnthropicMessage } from '../types/anthropicMessage';
import { OpenAIMessage } from '../types/openaiMessage';
import { UIMessage } from '../types/uiMessage';

export function openAIMessageToUI(
  message: OpenAIMessage,
  timestamp: number,
  toolNameMap?: Map<string, string>,
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
          uiMessages.push({
            role: 'tool_call',
            content: toolCall.function.arguments,
            timestamp,
            toolName: toolCall.function.name,
            toolCallId: toolCall.id,
          });
        });
      }
      break;
    }

    case 'tool': {
      const toolName = toolNameMap?.get(message.tool_call_id ?? '') ?? message.tool_call_id;
      if (typeof message.content === 'string') {
        if (message.content.trim()) {
          uiMessages.push({
            role: 'tool_result',
            content: message.content,
            timestamp,
            toolName,
            toolCallId: message.tool_call_id,
          });
        }
      } else if (Array.isArray(message.content)) {
        const textParts = message.content.filter(part => part.type === 'text').map(part =>
          part.text
        );
        if (textParts.length > 0) {
          const content = textParts.join('\n');
          if (content.trim()) {
            uiMessages.push({
              role: 'tool_result',
              content,
              timestamp,
              toolName,
              toolCallId: message.tool_call_id,
            });
          }
        }
      }
      break;
    }
  }

  return uiMessages;
}

export function anthropicMessageToUI(
  message: AnthropicMessage,
  timestamp: number,
  toolNameMap?: Map<string, string>,
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
      uiMessages.push({
        role: 'tool_call',
        content: JSON.stringify(block.input),
        timestamp,
        toolName: block.name,
        toolCallId: block.id,
      });
    } else if (block.type === 'tool_result') {
      const toolName = toolNameMap?.get(block.tool_use_id);
      if (typeof block.content === 'string') {
        uiMessages.push({
          role: 'tool_result',
          content: block.content,
          timestamp,
          toolName,
          toolCallId: block.tool_use_id,
        });
      } else {
        const content = block.content.filter(part => part.type === 'text').map(part => part.text)
          .join('\n');
        uiMessages.push({
          role: 'tool_result',
          content,
          timestamp,
          toolName,
          toolCallId: block.tool_use_id,
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
  const toolNameMap = new Map<string, string>();

  messages.forEach((message, index) => {
    const timestamp = Date.now() - (messages.length - index) * 1000;

    if (provider === 'openai') {
      const openaiMsg = message as OpenAIMessage;

      if (openaiMsg.role === 'assistant' && openaiMsg.tool_calls) {
        openaiMsg.tool_calls.forEach(tc => {
          toolNameMap.set(tc.id, tc.function.name);
        });
      }

      uiMessages.push(...openAIMessageToUI(openaiMsg, timestamp, toolNameMap));
    } else {
      const anthropicMsg = message as AnthropicMessage;

      if (anthropicMsg.role === 'assistant' && Array.isArray(anthropicMsg.content)) {
        anthropicMsg.content.forEach(block => {
          if (block.type === 'tool_use') {
            toolNameMap.set(block.id, block.name);
          }
        });
      }

      uiMessages.push(...anthropicMessageToUI(anthropicMsg, timestamp, toolNameMap));
    }
  });

  const finalMessages: UIMessage[] = [];
  uiMessages.forEach(msg => {
    if (msg.role === 'tool_result') {
      const toolCallId = msg.toolCallId;
      const toolCall = finalMessages.find(m =>
        m.role === 'tool_call' && m.toolCallId === toolCallId
      );
      if (toolCall) {
        toolCall.toolResult = msg.content;
      }
    } else {
      finalMessages.push(msg);
    }
  });

  return finalMessages;
}
