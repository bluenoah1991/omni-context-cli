import * as fs from 'fs/promises';
import * as path from 'path';
import { registerTool } from '../toolExecutor';

export function registerAppendTool(): void {
  registerTool(
    {
      name: 'append',
      description:
        `Add content to the beginning or end of a file. The original content is preserved. Useful for adding imports at the top, exports at the bottom, or any content that should be added to either end. The file must already exist - use 'write' for new files.`,
      formatCall: (args: Record<string, unknown>) => String(args.filePath || ''),
      parameters: {
        properties: {
          filePath: {type: 'string', description: 'Path to the file. Must be an existing file'},
          text: {
            type: 'string',
            description:
              'Text to add to the file. Include newlines as needed for proper formatting.',
          },
          position: {
            type: 'string',
            description:
              'Where to add the content: "start" to insert at beginning, "end" to append at end. Default is "end".',
            enum: ['start', 'end'],
          },
        },
        required: ['filePath', 'text'],
      },
    },
    async (
      args: {filePath: string; text: string; position?: 'start' | 'end';},
      signal?: AbortSignal,
    ) => {
      const {filePath, text, position = 'end'} = args;

      if (!filePath) {
        throw new Error(
          'Missing required parameter: filePath. Please specify which file to modify.',
        );
      }
      if (text === undefined) {
        throw new Error('Missing required parameter: text. Please provide the content to add.');
      }

      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);

      let content: string;
      try {
        content = await fs.readFile(absolutePath, 'utf-8');
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          throw new Error(
            `File not found: ${absolutePath}. This tool only works with existing files. Use 'write' to make a new file.`,
          );
        }
        throw error;
      }

      const newContent = position === 'start' ? text + content : content + text;

      await fs.writeFile(absolutePath, newContent, 'utf-8');

      const addedLines = text.split('\n').length;
      const location = position === 'start' ? 'start of' : 'end of';
      return {
        result: {content: `Added ${addedLines} lines to ${location} ${absolutePath}`},
        displayText: `Added ${addedLines} lines to ${location}`,
      };
    },
  );
}
