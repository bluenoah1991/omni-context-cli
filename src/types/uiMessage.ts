export type MessageRole = 'user' | 'assistant' | 'thinking' | 'tool_call' | 'tool_result';

export interface Attachment {
  url: string;
  mimeType: string;
  fileName?: string;
}

export interface UIMessage {
  role: MessageRole;
  content: string;
  timestamp: number;
  toolName?: string;
  toolCallId?: string;
  attachments?: Attachment[];
}
