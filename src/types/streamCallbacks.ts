import { Session } from './session';

export interface StreamCallbacks {
  onContent?: (content: string) => void;
  onError?: (errorText: string) => void;
  onThinking?: (thinking: string) => void;
  onToolCall?: (toolCall: ToolCall) => void;
  onToolResult?: (toolResult: ToolResult) => void;
  onSessionUpdate?: (session: Session) => void;
}

export interface ToolCall {
  id?: string;
  name: string;
  input: any;
}

export interface ToolResult {
  id?: string;
  name: string;
  content: string;
  dataUrl?: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

export interface StreamResult<T> {
  message: T;
  tokenUsage: TokenUsage;
}
