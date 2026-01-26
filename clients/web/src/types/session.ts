import type { UIMessage } from './uiMessage';

export interface Session {
  id: string;
  title: string;
  provider: string;
  messages?: UIMessage[];
  createdAt: number;
  updatedAt: number;
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
}

export interface SessionSummary {
  id: string;
  title: string;
  provider: string;
  createdAt: number;
  updatedAt: number;
}
