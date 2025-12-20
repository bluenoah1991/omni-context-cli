import * as fs from 'fs/promises';
import * as path from 'path';
import { registerTool } from '../toolExecutor';

export function registerWriteTool(): void {
  registerTool({
    name: 'write',
    description:
      `Write content to a file, creating parent directories if needed. This will overwrite existing files without warning - use with caution. For new files, prefer 'create' which prevents accidental overwrites. For partial updates, use 'edit' instead.`,
    parameters: {
      properties: {
        filePath: {
          type: 'string',
          description:
            'Destination file path. Can be relative or absolute. Parent directories will be created automatically',
        },
        content: {
          type: 'string',
          description:
            'The complete file content to write. Will replace any existing content entirely',
        },
      },
      required: ['filePath', 'content'],
    },
  }, async (args: {content: string; filePath: string;}, signal?: AbortSignal) => {
    const {content, filePath} = args;

    if (!filePath) {
      throw new Error(
        'Missing required parameter: filePath. Please specify where to save the file.',
      );
    }
    if (content === undefined) {
      throw new Error('Missing required parameter: content. Please provide the content to write.');
    }

    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    const dir = path.dirname(absolutePath);
    await fs.mkdir(dir, {recursive: true});

    await fs.writeFile(absolutePath, content, 'utf-8');

    const lines = content.split('\n').length;
    return {content: `Written ${lines} lines to ${absolutePath}`};
  });
}
