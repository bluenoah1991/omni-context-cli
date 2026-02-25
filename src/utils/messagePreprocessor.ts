import type { IDEContextItem } from '../types/ide';

export function wrapDualMessage(uiMessage: string, promptMessage: string): string {
  return `<dual_message>\n<ui>${uiMessage}</ui>\n<prompt>\n${promptMessage}\n</prompt>\n</dual_message>`;
}

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

export function wrapIDEContexts(text: string, contexts: IDEContextItem[]): string {
  const seen = new Set<string>();
  for (const ctx of contexts) {
    if (seen.has(ctx.path)) continue;
    seen.add(ctx.path);
    if (ctx.content) {
      const lineRange = ctx.lineStart != null
        ? (!ctx.lineEnd || ctx.lineStart === ctx.lineEnd
          ? `${ctx.lineStart}`
          : `${ctx.lineStart}-${ctx.lineEnd}`)
        : undefined;
      const attrs = lineRange ? ` lines="${lineRange}"` : '';
      text = `${text}\n\n<ide_context file="${ctx.path}"${attrs}>\n${ctx.content}\n</ide_context>`;
    } else {
      text = `${text}\n\n<ide_context file="${ctx.path}" />`;
    }
  }
  return text;
}

export function removeIDEContext(text: string): string {
  return text.replace(/<ide_context[^>]*>.*?<\/ide_context>/gs, '').replace(
    /<ide_context[^>]*\/>/g,
    '',
  ).trim();
}

export function wrapFileContext(text: string, name: string, content: string): string {
  const tag = `<file_context path="${name}">\n${content}\n</file_context>`;
  return text ? `${text}\n\n${tag}` : tag;
}

export function removeFileContext(text: string): string {
  return text.replace(/<file_context path="[^"]*">[\s\S]*?<\/file_context>/g, '').trim();
}
