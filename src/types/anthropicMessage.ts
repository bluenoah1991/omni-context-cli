export type AnthropicMessageRole = 'user' | 'assistant';

export type AnthropicContentBlock =
  | {type: 'text'; text: string;}
  | {type: 'thinking'; thinking: string; signature?: string;}
  | {type: 'tool_use'; id: string; name: string; input: Record<string, any>;}
  | {type: 'tool_result'; tool_use_id: string; content: string | AnthropicContentBlock[];};

export interface AnthropicMessage {
  role: AnthropicMessageRole;
  content: string | AnthropicContentBlock[];
  tokenUsage?: number;
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
}
