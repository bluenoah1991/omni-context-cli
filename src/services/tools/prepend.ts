import * as fs from 'fs/promises';
import * as path from 'path';
import { registerTool } from '../toolExecutor';

export function registerPrependTool(): void {
  registerTool({
    name: 'prepend',
    description: 'Prepends to a file',
    parameters: {
      properties: {
        filePath: {type: 'string', description: 'The path to the file'},
        text: {type: 'string', description: 'The text to prepend'},
      },
      required: ['filePath', 'text'],
    },
  }, async (args: {filePath: string; text: string;}) => {
    const {filePath, text} = args;

    if (!filePath) {
      throw new Error('filePath is required');
    }
    if (text === undefined) {
      throw new Error('text is required');
    }

    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    let content: string;
    try {
      content = await fs.readFile(absolutePath, 'utf-8');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${absolutePath}`);
      }
      throw error;
    }

    const newContent = text + content;

    await fs.writeFile(absolutePath, newContent, 'utf-8');

    return {content: ''};
  });
}
