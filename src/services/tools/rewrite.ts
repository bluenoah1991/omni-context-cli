import * as fs from 'fs/promises';
import * as path from 'path';
import { registerTool } from '../toolExecutor';

export function registerRewriteTool(): void {
  registerTool({
    name: 'rewrite',
    description:
      `Completely replace an existing file's content. Unlike 'write', this requires the file to exist first - it's a safety measure to prevent accidental file creation. Use this when you need to overwrite a file entirely. For partial modifications, prefer 'edit' to change specific sections.`,
    formatCall: (args: Record<string, unknown>) => String(args.filePath || ''),
    parameters: {
      properties: {
        filePath: {type: 'string', description: 'Path to the existing file to rewrite'},
        text: {
          type: 'string',
          description:
            'The new complete content for the file. This will replace everything currently in the file',
        },
      },
      required: ['filePath', 'text'],
    },
  }, async (args: {filePath: string; text: string;}, signal?: AbortSignal) => {
    const {filePath, text} = args;

    if (!filePath) {
      throw new Error(
        'Missing required parameter: filePath. Please specify which file to rewrite.',
      );
    }
    if (text === undefined) {
      throw new Error('Missing required parameter: text. Please provide the new file content.');
    }

    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    try {
      await fs.access(absolutePath, fs.constants.R_OK);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(
          `File not found: ${absolutePath}. Rewrite only works on existing files. Use 'create' to make a new file.`,
        );
      }
      throw error;
    }

    await fs.writeFile(absolutePath, text, 'utf-8');

    const lines = text.split('\n').length;
    return {
      result: {content: `Rewrote ${absolutePath} (${lines} lines)`},
      displayText: 'File rewritten successfully',
    };
  });
}
