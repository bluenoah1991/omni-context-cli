import * as fs from 'fs/promises';
import * as path from 'path';
import { registerTool } from '../toolExecutor';

export function registerCreateTool(): void {
  registerTool({
    name: 'create',
    description:
      `Create a new file with the given content. This tool is safe - it will refuse to overwrite existing files. Use this when you want to add a new file to the project. For modifying existing files, use 'edit' or 'rewrite' instead.`,
    parameters: {
      properties: {
        filePath: {
          type: 'string',
          description:
            "Path for the new file. Parent directories will be created automatically if they don't exist",
        },
        content: {type: 'string', description: 'The complete content for the new file'},
      },
      required: ['filePath', 'content'],
    },
  }, async (args: {filePath: string; content: string;}) => {
    const {filePath, content} = args;

    if (!filePath) {
      throw new Error(
        'Missing required parameter: filePath. Please specify where to create the file.',
      );
    }
    if (content === undefined) {
      throw new Error('Missing required parameter: content. Please provide the file content.');
    }

    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    try {
      await fs.access(absolutePath);
      throw new Error(
        `File already exists: ${absolutePath}. To modify it, use 'edit' for partial changes or 'rewrite' to replace all content.`,
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
    return {content: `Created ${absolutePath} (${lines} lines)`, lines};
  });
}
