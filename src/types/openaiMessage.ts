export type OpenAIMessageRole = 'user' | 'assistant' | 'tool';

export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {name: string; arguments: string;};
}

export interface OpenAIMessage {
  role: OpenAIMessageRole;
  content: string;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
  reasoning_content?: string;
}
