export type MessageRole = 'user' | 'assistant' | 'thinking' | 'tool_call';

export interface UIMessage {
  role: MessageRole;
  content: string;
  timestamp: number;
  toolName?: string;
  toolCallId?: string;
  toolResult?: string;
}
