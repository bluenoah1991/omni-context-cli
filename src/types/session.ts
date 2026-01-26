import { AnthropicMessage } from './anthropicMessage.js';
import { Provider } from './config.js';
import { GeminiMessage } from './geminiMessage.js';
import { OpenAIMessage } from './openaiMessage.js';
import { ResponsesMessage } from './responsesMessage.js';

export type ChatMessage = OpenAIMessage | AnthropicMessage | GeminiMessage | ResponsesMessage;

export interface Session {
  id: string;
  title: string;
  provider: Provider;
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

export type SessionIndexEntry = {
  id: string;
  path: string;
  title: string;
  provider: Provider;
  createdAt: number;
  updatedAt: number;
};

export type SessionIndex = SessionIndexEntry[];
