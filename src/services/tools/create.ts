import * as fs from 'fs/promises';
import * as path from 'path';
import { registerTool } from '../toolExecutor';

export function registerCreateTool(): void {
  registerTool({
    name: 'create',
    description: 'Creates a new file with the specified content',
    parameters: {
      properties: {
        filePath: {type: 'string', description: 'Path where the file should be created'},
        content: {type: 'string', description: 'Content to write to the file'},
      },
      required: ['filePath', 'content'],
    },
  }, async (args: {filePath: string; content: string;}) => {
    const {filePath, content} = args;

    if (!filePath) {
      throw new Error('filePath is required');
    }
    if (content === undefined) {
      throw new Error('content is required');
    }

    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    try {
      await fs.access(absolutePath);
      throw new Error(
        `File already exists: ${absolutePath}. Use edit or rewrite to modify existing files.`,
      );
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    const dir = path.dirname(absolutePath);
    await fs.mkdir(dir, {recursive: true});

    await fs.writeFile(absolutePath, content, 'utf-8');

    const lines = content.split('\n').length;
    return {content: '', lines};
  });
}
