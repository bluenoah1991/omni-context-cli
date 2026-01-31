export interface ResponsesInputText {
  type: 'input_text';
  text: string;
}

export interface ResponsesInputImage {
  type: 'input_image';
  image_url: string;
  detail: 'auto';
}

export interface ResponsesInputFile {
  type: 'input_file';
  file_data: string;
  filename: string;
}

export interface ResponsesOutputText {
  type: 'output_text';
  text: string;
}

export interface ResponsesMessageItem {
  type: 'message';
  role: 'user' | 'assistant' | 'system' | 'developer';
  content:
    | string
    | Array<ResponsesInputText | ResponsesOutputText | ResponsesInputImage | ResponsesInputFile>;
  status?: 'in_progress' | 'completed' | 'incomplete';
  id?: string;
}

export interface ResponsesFunctionCall {
  type: 'function_call';
  id?: string;
  call_id: string;
  name: string;
  arguments: string;
  status?: 'in_progress' | 'completed' | 'incomplete';
}

export interface ResponsesFunctionCallOutput {
  type: 'function_call_output';
  call_id: string;
  output: string | (ResponsesInputText | ResponsesInputImage | ResponsesInputFile)[];
  id?: string;
}

export interface ResponsesReasoningItem {
  type: 'reasoning';
  id?: string;
  summary?: Array<{type: 'summary_text'; text: string;}>;
  content?: Array<{type: 'reasoning_text'; text: string;}>;
  status?: 'in_progress' | 'completed' | 'incomplete';
}

export type ResponsesContentItem =
  | ResponsesMessageItem
  | ResponsesFunctionCall
  | ResponsesFunctionCallOutput
  | ResponsesReasoningItem;

export interface ResponsesMessage {
  type: 'responses';
  role: 'assistant' | 'user';
  items: ResponsesContentItem[];
  content?: string;
}
