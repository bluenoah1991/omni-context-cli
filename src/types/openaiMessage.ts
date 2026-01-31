export type OpenAIMessageRole = 'user' | 'assistant' | 'tool';

export type OpenAIContentPart = {type: 'text'; text: string;} | {
  type: 'image_url';
  image_url: {url: string;};
} | {type: 'file'; file: {file_data: string; filename: string;};};

export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {name: string; arguments: string;};
}

export interface OpenAIMessage {
  role: OpenAIMessageRole;
  content?: string | OpenAIContentPart[];
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
  reasoning?: string;
  reasoning_content?: string;
  reasoning_details?: any[];
}
