import { AnthropicMessage } from './anthropicMessage.js';
import { GeminiMessage } from './geminiMessage.js';
import { OpenAIMessage } from './openaiMessage.js';
import { ResponsesMessage } from './responsesMessage.js';

export type ChatMessage = OpenAIMessage | AnthropicMessage | GeminiMessage | ResponsesMessage;

export interface Session {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  modelId?: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
}

export interface RewindPoint {
  index: number;
  label: string;
}
