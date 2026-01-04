import { ChatMessage, Session } from '../types/session';
import { removeIDEContext, unwrapPromptMessage } from './messagePreprocessor';

export function extractTextContent(message: ChatMessage): string {
  const content = (message as any).content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content.filter((block: any) => block.type === 'text').map((block: any) => block.text)
      .join('\n');
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
    if (message.role !== 'user' && message.role !== 'assistant') {
      continue;
    }

    let content = extractTextContent(message);
    if (content) {
      content = removeIDEContext(unwrapPromptMessage(content));
      distilled.push({role: message.role, content});
    }
  }

  return JSON.stringify(distilled, null, 2);
}
