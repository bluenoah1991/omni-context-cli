export type AnthropicMessageRole = 'user' | 'assistant';

export type AnthropicTextBlock = {type: 'text'; text: string;};
export type AnthropicImageBlock = {
  type: 'image';
  source: {type: 'base64'; media_type: string; data: string;};
};
export type AnthropicDocumentBlock = {
  type: 'document';
  source: {type: 'base64'; media_type: string; data: string;};
};
export type AnthropicToolResultContent =
  | AnthropicTextBlock
  | AnthropicImageBlock
  | AnthropicDocumentBlock;

export type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicImageBlock
  | AnthropicDocumentBlock
  | {type: 'thinking'; thinking: string; signature?: string;}
  | {type: 'tool_use'; id: string; name: string; input: Record<string, any>;}
  | {type: 'tool_result'; tool_use_id: string; content: string | AnthropicToolResultContent[];};

export interface AnthropicMessage {
  role: AnthropicMessageRole;
  content: string | AnthropicContentBlock[];
}
