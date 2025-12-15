import { AnthropicMessage } from './anthropicMessage.js';
import { OpenAIMessage } from './openaiMessage.js';

export type ChatMessage = OpenAIMessage | AnthropicMessage;

export interface Session {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}
