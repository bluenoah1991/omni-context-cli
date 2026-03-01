import { ChatMessage, Session } from '../types/session';
import { removeFileContext, removeIDEContext, unwrapPromptMessage } from './messagePreprocessor';

export function extractThinking(message: any): string {
  if (!message) return '';

  if (message.reasoning) {
    return message.reasoning;
  }

  if (message.reasoning_content) {
    return message.reasoning_content;
  }

  if (Array.isArray(message.reasoning_details)) {
    return message.reasoning_details.map((item: any) => item.text || '').filter(Boolean).join('\n');
  }

  return '';
}

export function extractTextContent(message: any): string {
  if (!message) return '';

  if (message.type === 'responses' && Array.isArray(message.items)) {
    if (message.items.some((item: any) => item.type === 'function_call_output')) return '';
    for (const item of message.items) {
      if (item.type === 'message') {
        if (typeof item.content === 'string') return item.content;
        if (Array.isArray(item.content)) {
          const inputText = item.content.find((c: any) => c.type === 'input_text');
          if (inputText) return inputText.text;
          const outputText = item.content.find((c: any) => c.type === 'output_text');
          if (outputText) return outputText.text;
        }
      }
    }
    return message.content || '';
  }

  if (typeof message.content === 'string') {
    return message.content;
  }

  if (Array.isArray(message.content)) {
    return message.content.filter((block: any) => block.type === 'text').map((block: any) =>
      block.text
    ).join('\n');
  }

  if (Array.isArray(message.parts)) {
    return message.parts.filter((part: any) => part.text && !part.thought).map((part: any) =>
      part.text
    ).join('\n');
  }

  return '';
}

export function getLastResponse(session: Session): string {
  const lastMessage = session.messages[session.messages.length - 1];
  return extractTextContent(lastMessage);
}

export function distillMessages(messages: ChatMessage[]): string {
  const distilled: Array<{role: string; content: string;}> = [];

  for (const message of messages) {
    if (message.role !== 'user' && message.role !== 'assistant' && message.role !== 'model') {
      continue;
    }

    let content = extractTextContent(message);
    if (content) {
      content = removeFileContext(removeIDEContext(unwrapPromptMessage(content)));
      distilled.push({role: message.role, content});
    }
  }

  return JSON.stringify(distilled, null, 2);
}
