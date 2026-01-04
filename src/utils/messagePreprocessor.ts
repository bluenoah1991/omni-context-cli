import { IDESelection } from '../types/ide';

export function unwrapUIMessage(text: string): string {
  const match = text.match(
    /<dual_message>\s*<ui>([\s\S]*?)<\/ui>\s*<prompt>[\s\S]*?<\/prompt>\s*<\/dual_message>/,
  );
  if (match) {
    return match[1].trim();
  }
  return text;
}

export function unwrapPromptMessage(text: string): string {
  const match = text.match(
    /<dual_message>\s*<ui>[\s\S]*?<\/ui>\s*<prompt>([\s\S]*?)<\/prompt>\s*<\/dual_message>/,
  );
  if (match) {
    return match[1].trim();
  }
  return text;
}

export function wrapDualMessage(uiMessage: string, promptMessage: string): string {
  return `<dual_message>\n<ui>${uiMessage}</ui>\n<prompt>\n${promptMessage}\n</prompt>\n</dual_message>`;
}

export function wrapIDEContext(text: string, selection: IDESelection | null): string {
  if (!selection) return text;

  if (selection.text) {
    const lineRange = selection.lineStart === selection.lineEnd
      ? `${selection.lineStart}`
      : `${selection.lineStart}-${selection.lineEnd}`;
    return `${text}\n\n<ide_context file="${selection.filePath}" lines="${lineRange}">\n${selection.text}\n</ide_context>`;
  }
  return `${text}\n\n<ide_context file="${selection.filePath}" />`;
}

export function removeIDEContext(text: string): string {
  return text.replace(/<ide_context[^>]*>.*?<\/ide_context>/gs, '').replace(
    /<ide_context[^>]*\/>/g,
    '',
  ).trim();
}
