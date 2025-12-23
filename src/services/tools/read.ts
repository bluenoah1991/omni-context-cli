import * as fs from 'fs/promises';
import * as path from 'path';
import { registerTool } from '../toolExecutor';

const DEFAULT_READ_LIMIT = 50;
const MAX_LINE_LENGTH = 1000;

export function registerReadTool(): void {
  registerTool({
    name: 'read',
    description:
      `Read the contents of a file with line numbers. Returns numbered lines for easy reference when editing. Use offset and limit for large files - start with the beginning, then read more sections as needed. Output format: each line prefixed with its line number (e.g., "00001| content").`,
    formatCall: (args: Record<string, unknown>) => String(args.filePath || ''),
    parameters: {
      properties: {
        filePath: {
          type: 'string',
          description:
            'Path to the file to read. Can be relative (resolved from current dir) or absolute',
        },
        offset: {
          type: 'number',
          description:
            'Starting line number (0-based index). Use this to skip to a specific section. For example, offset=100 starts reading from line 101',
        },
        limit: {
          type: 'number',
          description:
            'Maximum number of lines to read. Defaults to 50. Increase for larger files, decrease if you only need a quick peek',
        },
      },
      required: ['filePath'],
    },
  }, async (args: {filePath: string; offset?: number; limit?: number;}, signal?: AbortSignal) => {
    const {filePath, offset = 0, limit = DEFAULT_READ_LIMIT} = args;

    if (!filePath) {
      throw new Error('Missing required parameter: filePath. Please specify which file to read.');
    }

    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

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
            `File not found: ${absolutePath}\n\nPerhaps you meant one of these?\n  ${
              suggestions.join('\n  ')
            }`,
          );
        }
      } catch {
      }

      throw new Error(
        `File not found: ${absolutePath}. Double-check the path or use the list/glob tool to find files.`,
      );
    }

    const content = await fs.readFile(absolutePath, 'utf-8');
    const lines = content.split('\n');
    const raw = lines.slice(offset, offset + limit).map(line => {
      return line.length > MAX_LINE_LENGTH ? line.substring(0, MAX_LINE_LENGTH) + '...' : line;
    });

    const formattedContent = raw.map((line, index) => {
      return `${(index + offset + 1).toString().padStart(5, '0')}| ${line}`;
    });

    let output = '<file>\n';
    output += formattedContent.join('\n');

    const totalLines = lines.length;
    const lastReadLine = offset + formattedContent.length;
    const hasMoreLines = totalLines > lastReadLine;

    if (hasMoreLines) {
      output += `\n\n[More content available. Read from line ${
        lastReadLine + 1
      } onward using offset=${lastReadLine}]`;
    } else {
      output += `\n\n[End of file - ${totalLines} lines total]`;
    }
    output += '\n</file>';

    return {
      result: {content: output, lines: totalLines, path: absolutePath},
      displayText: `Got ${totalLines} lines of output`,
    };
  });
}
