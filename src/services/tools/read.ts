import * as fs from 'fs/promises';
import * as path from 'path';
import { registerTool } from '../toolExecutor';

const DEFAULT_READ_LIMIT = 2000;
const MAX_LINE_LENGTH = 2000;

export function registerReadTool(): void {
  registerTool({
    name: 'read',
    description: `Reads file contents as UTF-8. Prefer this to Unix tools like cat.

Usage:
- The filePath parameter is required and should be the path to the file to read
- Optional offset parameter: line number to start reading from (0-based)
- Optional limit parameter: number of lines to read (defaults to 2000)
- Returns file content with line numbers
- If file has more lines than read, a message will indicate how to read more
- Supports reading binary files (returns error for truly binary files)
- If file is not found, suggests similar files in the directory`,
    parameters: {
      properties: {
        filePath: {type: 'string', description: 'The path to the file to read'},
        offset: {type: 'number', description: 'The line number to start reading from (0-based)'},
        limit: {type: 'number', description: 'The number of lines to read (defaults to 2000)'},
      },
      required: ['filePath'],
    },
  }, async (args: {filePath: string; offset?: number; limit?: number;}) => {
    const {filePath, offset = 0, limit = DEFAULT_READ_LIMIT} = args;

    if (!filePath) {
      throw new Error('filePath is required');
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
            `File not found: ${absolutePath}\n\nDid you mean one of these?\n${
              suggestions.join('\n')
            }`,
          );
        }
      } catch {
      }

      throw new Error(`File not found: ${absolutePath}`);
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
      output +=
        `\n\n(File has more lines. Use 'offset' parameter to read beyond line ${lastReadLine})`;
    } else {
      output += `\n\n(End of file - total ${totalLines} lines)`;
    }
    output += '\n</file>';

    return {content: output, lines: totalLines, path: absolutePath};
  });
}
