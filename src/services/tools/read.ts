import * as fs from 'fs/promises';
import * as path from 'path';
import { normalizePath } from '../../utils/wsl';
import { registerTool } from '../toolExecutor';

const DEFAULT_READ_LIMIT = 50;
const MAX_LINE_LENGTH = 1000;

const IMAGE_EXTENSIONS: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

function getImageMimeType(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  return IMAGE_EXTENSIONS[ext] || null;
}

export function registerReadTool(): void {
  registerTool({
    name: 'Read',
    builtin: true,
    description:
      `Read file contents with line numbers. Great for previewing files, reviewing code before edits, or checking specific sections of large files. Returns numbered lines for easy reference. For large files, use offset and limit—start at the top, then read more as needed. Format: line number prefix like "00001| content". Also supports reading images (PNG, JPG, GIF, WEBP) for visual inspection.`,
    formatCall: (args: Record<string, unknown>) => String(args.filePath || ''),
    parameters: {
      properties: {
        filePath: {
          type: 'string',
          description: 'File path. Can be relative (from current directory) or absolute.',
        },
        offset: {
          type: 'number',
          description:
            'Start line (0-based). Skips to a specific section. For example, offset=100 starts at line 101.',
        },
        limit: {
          type: 'number',
          description:
            'Max lines to read. Default: 50. Increase this for larger files or decrease for quick previews.',
        },
      },
      required: ['filePath'],
    },
  }, async (args: {filePath: string; offset?: number; limit?: number;}, signal?: AbortSignal) => {
    const {filePath, offset = 0, limit = DEFAULT_READ_LIMIT} = args;

    if (!filePath) {
      throw new Error('You need to provide a filePath. Which file do you want to read?');
    }

    const absolutePath = path.resolve(await normalizePath(filePath));

    try {
      await fs.access(absolutePath, fs.constants.R_OK);
    } catch {
      const dir = path.dirname(absolutePath);
      const base = path.basename(absolutePath);

      try {
        const dirEntries = await fs.readdir(dir);
        const suggestions = dirEntries.filter(entry =>
          entry.toLowerCase().includes(base.toLowerCase())
          || base.toLowerCase().includes(entry.toLowerCase())
        ).map(entry => path.join(dir, entry)).slice(0, 3);

        if (suggestions.length > 0) {
          throw new Error(
            `File not found: ${absolutePath}\n\nMaybe one of these?\n  ${suggestions.join('\n  ')}`,
          );
        }
      } catch {
      }

      throw new Error(
        `File not found: ${absolutePath}. Check the path or use 'glob' to find files.`,
      );
    }

    const mimeType = getImageMimeType(absolutePath);
    if (mimeType) {
      const buffer = await fs.readFile(absolutePath);
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64}`;
      return {result: `Image file: ${absolutePath}`, displayText: `Read image`, dataUrl};
    }

    const content = await fs.readFile(absolutePath, 'utf-8');
    const lines = content.split('\n');
    const raw = lines.slice(offset, offset + limit).map(line => {
      return line.length > MAX_LINE_LENGTH ? line.substring(0, MAX_LINE_LENGTH) + '...' : line;
    });

    const formattedContent = raw.map((line, index) => {
      return `${(index + offset + 1).toString().padStart(5, '0')}| ${line}`;
    });

    const totalLines = lines.length;
    const linesRead = formattedContent.length;
    const lastReadLine = offset + linesRead;
    const hasMoreLines = totalLines > lastReadLine;

    let output = formattedContent.join('\n');
    if (hasMoreLines) {
      output += `\n\n[More below. Continue from line ${
        lastReadLine + 1
      } with offset=${lastReadLine}]`;
    } else {
      output += `\n\n[End of file—${totalLines} lines total]`;
    }

    return {result: output, displayText: `Read ${linesRead} lines`};
  });
}
