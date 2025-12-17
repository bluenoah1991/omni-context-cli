import { AnthropicMessage } from '../types/anthropicMessage';
import { ContextWindowConfig, WindowedMessages } from '../types/contextWindow';
import { ChatMessage } from '../types/session';

function isHumanMessage(message: ChatMessage): boolean {
  if (message.role !== 'user') {
    return false;
  }

  const anthropicMessage = message as AnthropicMessage;
  if (typeof anthropicMessage.content === 'string') {
    return true;
  }

  return !anthropicMessage.content.some(block => block.type === 'tool_result');
}

export function countTotalTokens(messages: ChatMessage[]): number {
  let total = 0;
  for (const message of messages) {
    if (message.role === 'assistant' && 'tokenUsage' in message && message.tokenUsage) {
      total += message.tokenUsage;
    }
  }
  return total;
}

export function applyContextWindow(
  messages: ChatMessage[],
  config: ContextWindowConfig,
): WindowedMessages {
  const usageRatio = config.usageRatio ?? 0.8;
  const maxAllowedTokens = Math.floor(config.maxTokens * usageRatio);

  const totalTokens = countTotalTokens(messages);
  if (totalTokens <= maxAllowedTokens) {
    return {appliedWindow: false, messages, droppedCount: 0};
  }

  let runningTokens = 0;
  let overLimitIndex = -1;

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === 'assistant' && 'tokenUsage' in message && message.tokenUsage) {
      runningTokens += message.tokenUsage;
      if (runningTokens > maxAllowedTokens) {
        overLimitIndex = i;
        break;
      }
    }
  }

  let cutIndex = -1;
  if (overLimitIndex !== -1) {
    for (let i = overLimitIndex + 1; i < messages.length; i++) {
      if (isHumanMessage(messages[i])) {
        cutIndex = i;
        break;
      }
    }
  }

  if (cutIndex === -1) {
    return {appliedWindow: false, messages, droppedCount: 0};
  }

  const windowedMessages = messages.slice(cutIndex);

  return {
    appliedWindow: true,
    messages: windowedMessages,
    droppedCount: messages.length - windowedMessages.length,
  };
}
