import * as fs from 'fs/promises';
import * as path from 'path';
import { registerTool } from '../toolExecutor';

export function registerPrependTool(): void {
  registerTool({
    name: 'prepend',
    description:
      `Insert text at the beginning of an existing file. The original content is preserved and shifted down. Useful for adding imports, headers, license comments, or any content that should appear at the top. The file must already exist - use 'create' for new files.`,
    parameters: {
      properties: {
        filePath: {type: 'string', description: 'Path to the file. Must be an existing file'},
        text: {
          type: 'string',
          description:
            'Text to insert at the beginning. Remember to include trailing newlines if you want separation from existing content',
        },
      },
      required: ['filePath', 'text'],
    },
  }, async (args: {filePath: string; text: string;}, signal?: AbortSignal) => {
    const {filePath, text} = args;

    if (!filePath) {
      throw new Error(
        'Missing required parameter: filePath. Please specify which file to prepend to.',
      );
    }
    if (text === undefined) {
      throw new Error('Missing required parameter: text. Please provide the content to prepend.');
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
          `File not found: ${absolutePath}. This tool only works with existing files. Use 'create' to make a new file.`,
        );
      }
      throw error;
    }

    const newContent = text + content;

    await fs.writeFile(absolutePath, newContent, 'utf-8');

    const addedLines = text.split('\n').length;
    return {content: `Prepended ${addedLines} lines to ${absolutePath}`};
  });
}
