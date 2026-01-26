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
