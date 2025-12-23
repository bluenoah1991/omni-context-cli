import * as fs from 'fs/promises';
import * as path from 'path';
import { registerTool } from '../toolExecutor';

export function registerWriteTool(): void {
  registerTool(
    {
      name: 'write',
      description:
        `Write content to a file, creating parent directories if needed. This will overwrite existing files without warning - use with caution. For new files, use createOnly=true to prevent overwriting. For partial updates, use 'edit' or 'append' instead.`,
      formatCall: (args: Record<string, unknown>) => String(args.filePath || ''),
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
          createOnly: {
            type: 'boolean',
            description:
              'If true, only create new files and refuse to overwrite existing files. Default is false',
          },
        },
        required: ['filePath', 'content'],
      },
    },
    async (
      args: {content: string; filePath: string; createOnly?: boolean;},
      signal?: AbortSignal,
    ) => {
      const {content, filePath, createOnly = false} = args;

      if (!filePath) {
        throw new Error(
          'Missing required parameter: filePath. Please specify where to save the file.',
        );
      }
      if (content === undefined) {
        throw new Error(
          'Missing required parameter: content. Please provide the content to write.',
        );
      }

      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);

      if (createOnly) {
        try {
          await fs.access(absolutePath);
          throw new Error(
            `File already exists: ${absolutePath}. To modify it, use 'edit' for partial changes or 'write' to replace all content.`,
          );
        } catch (error: any) {
          if (error.code !== 'ENOENT') {
            throw error;
          }
        }
      }

      const dir = path.dirname(absolutePath);
      await fs.mkdir(dir, {recursive: true});

      await fs.writeFile(absolutePath, content, 'utf-8');

      const lines = content.split('\n').length;
      const action = createOnly ? 'Created' : 'Written';
      return {
        result: `${action} ${lines} lines to ${absolutePath}`,
        displayText: `${action} ${lines} lines`,
      };
    },
  );
}
