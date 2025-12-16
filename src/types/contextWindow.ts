import { ChatMessage } from './session';

export interface ContextWindowConfig {
  maxTokens: number;
  usageRatio?: number;
}

export interface WindowedMessages {
  appliedWindow: boolean;
  messages: ChatMessage[];
  droppedCount: number;
}
