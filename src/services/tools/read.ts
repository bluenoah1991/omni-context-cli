import * as fs from 'fs/promises';
import * as path from 'path';
import { registerTool } from '../toolExecutor';

export function registerReadTool(): void {
  registerTool({
    name: 'read',
    description: 'Reads file contents as UTF-8. Prefer this to Unix tools like `cat`',
    parameters: {
      properties: {filePath: {type: 'string', description: 'Path to file to read'}},
      required: ['filePath'],
    },
  }, async (args: {filePath: string;}) => {
    const {filePath} = args;

    if (!filePath) {
      throw new Error('filePath is required');
    }

    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    try {
      await fs.access(absolutePath, fs.constants.R_OK);
    } catch {
      throw new Error(`File not found or not readable: ${absolutePath}`);
    }

    const content = await fs.readFile(absolutePath, 'utf-8');
    const lines = content.split('\n').length;

    return {content, lines, path: absolutePath};
  });
}
