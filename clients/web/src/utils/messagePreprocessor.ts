import type { UIMessage } from '../types/uiMessage';

export function unwrapUIMessage(text: string): string {
  const match = text.match(
    /<dual_message>\s*<ui>([\s\S]*?)<\/ui>\s*<prompt>[\s\S]*?<\/prompt>\s*<\/dual_message>/,
  );
  if (match) {
    return match[1].trim();
  }
  return text;
}

export function removeIDEContext(text: string): string {
  return text.replace(/<ide_context[^>]*>.*?<\/ide_context>/gs, '').replace(
    /<ide_context[^>]*\/>/g,
    '',
  ).trim();
}

export function removeFileContext(text: string): string {
  return text.replace(/<file_context path="[^"]*">[\s\S]*?<\/file_context>/g, '').trim();
}

export function preprocessMessages(messages: UIMessage[]): UIMessage[] {
  const result: UIMessage[] = [];
  for (const message of messages) {
    if (message.role === 'tool_result') {
      const toolCallIndex = result.findLastIndex(item =>
        item.role === 'tool_call' && item.toolCallId === message.toolCallId
      );
      if (toolCallIndex !== -1) {
        result[toolCallIndex] = {...result[toolCallIndex], toolResult: message.content};
        continue;
      }
    }
    if (message.role === 'user') {
      result.push({
        ...message,
        content: removeFileContext(removeIDEContext(unwrapUIMessage(message.content))),
      });
    } else {
      result.push(message);
    }
  }
  return result;
}
