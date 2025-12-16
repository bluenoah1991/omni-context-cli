export type OpenAIMessageRole = 'user' | 'assistant' | 'tool';

export interface OpenAIContentPart {
  type: 'text';
  text: string;
}

export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {name: string; arguments: string;};
}

export interface OpenAIMessage {
  role: OpenAIMessageRole;
  content: string | OpenAIContentPart[];
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
  reasoning_content?: string;
}
