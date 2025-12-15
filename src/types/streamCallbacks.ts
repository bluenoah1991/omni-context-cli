export interface StreamCallbacks {
  onContent: (content: string) => void;
  onError?: (errorText: string) => void;
  onThinking: (thinking: string) => void;
  onToolCall: (toolCall: ToolCall) => void;
  onToolResult: (toolResult: ToolResult) => void;
}

export interface ToolCall {
  id: string;
  name: string;
  input: any;
}

export interface ToolResult {
  id: string;
  name: string;
  content: string;
}
