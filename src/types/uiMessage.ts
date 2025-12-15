export type MessageRole = 'user' | 'assistant' | 'thinking' | 'tool_use' | 'tool_result';

export interface UIMessage {
  role: MessageRole;
  content: string;
  timestamp: number;
  toolName?: string;
}
