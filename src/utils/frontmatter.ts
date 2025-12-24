import { load } from 'js-yaml';

const optionalByteOrderMark = '\\ufeff?';
const pattern = '^('
  + optionalByteOrderMark
  + '(= yaml =|---)'
  + '$([\\s\\S]*?)'
  + '^(?:\\2|\\.\\.\\.)\\s*'
  + '$'
  + (process.platform === 'win32' ? '\\r?' : '')
  + '(?:\\n)?)';
const regex = new RegExp(pattern, 'm');

export function parseFrontmatter(content: string): {data: any; content: string;} {
  const string = content || '';
  const lines = string.split(/(\r?\n)/);

  if (lines[0] && /= yaml =|---/.test(lines[0])) {
    return parse(string);
  }

  return {data: {}, content: string};
}

function parse(string: string): {data: any; content: string;} {
  const match = regex.exec(string);

  if (!match) {
    return {data: {}, content: string};
  }

  const yaml = match[match.length - 1].replace(/^\s+|\s+$/g, '');
  const data = (load(yaml) as any) || {};
  const body = string.replace(match[0], '');

  return {data, content: body};
}
