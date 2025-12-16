import { ContextWindowConfig, WindowedMessages } from '../types/contextWindow';
import { ChatMessage } from '../types/session';

function countTotalTokens(messages: ChatMessage[]): number {
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

  const windowedMessages: ChatMessage[] = [];
  let runningTokens = 0;

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];

    if (message.role === 'assistant' && 'tokenUsage' in message && message.tokenUsage) {
      if (runningTokens + message.tokenUsage > maxAllowedTokens) {
        break;
      }
      runningTokens += message.tokenUsage;
    }

    windowedMessages.unshift(message);
  }

  if (windowedMessages.length === 0 && messages.length > 0) {
    windowedMessages.push(messages[messages.length - 1]);
  }

  return {
    appliedWindow: true,
    messages: windowedMessages,
    droppedCount: messages.length - windowedMessages.length,
  };
}
