export type MessageRole = 'user' | 'assistant' | 'thinking' | 'tool_call' | 'tool_result';

export interface FileDiff {
  filePath: string;
  patch: string;
  toolUseId?: string;
}

export interface FilePreview {
  filePath: string;
  type: 'text' | 'image' | 'binary';
  content?: string;
  mimeType?: string;
  base64?: string;
  error?: string;
}

export type PreviewTab = {kind: 'diff'; data: FileDiff; pinned: boolean;} | {
  kind: 'file';
  data: FilePreview;
  pinned: boolean;
};

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
  toolResult?: string;
  attachments?: Attachment[];
}
