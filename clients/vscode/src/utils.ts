import { readFileSync } from 'fs';
import * as path from 'path';

export function loadTemplate(name: string, vars: Record<string, string> = {}): string {
  let content = readFileSync(path.join(__dirname, '..', 'templates', `${name}.html`), 'utf8');
  for (const [key, value] of Object.entries(vars)) {
    content = content.replaceAll(`{{${key}}}`, value);
  }
  return content;
}
