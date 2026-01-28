export type MessageRole = 'user' | 'assistant' | 'thinking' | 'tool_call' | 'tool_result';

export interface FileDiff {
  filePath: string;
  patch: string;
  toolUseId?: string;
}

export interface UIMessage {
  role: MessageRole;
  content: string;
  timestamp: number;
  toolName?: string;
  toolCallId?: string;
  toolResult?: string;
}
