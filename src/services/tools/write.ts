import * as fs from 'fs/promises';
import * as path from 'path';
import { registerTool } from '../toolExecutor';

export function registerWriteTool(): void {
  registerTool(
    {
      name: 'write',
      description:
        `Write content to a file, creating parent directories as needed. Overwrites existing files without warning—be careful. Good for new config files, writing complete contents, or initializing project files. To avoid accidents, use createOnly=true for new files. For partial updates, use 'edit' instead to preserve existing content.`,
      formatCall: (args: Record<string, unknown>) => String(args.filePath || ''),
      parameters: {
        properties: {
          filePath: {
            type: 'string',
            description:
              'Destination path. Relative or absolute. Creates parent directories automatically',
          },
          content: {type: 'string', description: 'Complete file content. Replaces everything'},
          createOnly: {
            type: 'boolean',
            description: 'Only create new files? Refuses to overwrite. Default: false',
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
        throw new Error('Need a filePath. Where do you want to save this?');
      }
      if (content === undefined) {
        throw new Error('Need content. What do you want to write?');
      }

      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);

      if (createOnly) {
        try {
          await fs.access(absolutePath);
          throw new Error(
            `File exists: ${absolutePath}. Use 'edit' for changes or 'write' to replace it all.`,
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
      const action = createOnly ? 'Created' : 'Wrote';
      return {
        result: `${action} ${lines} lines to ${absolutePath}`,
        displayText: `${action} ${lines} lines`,
      };
    },
  );
}
