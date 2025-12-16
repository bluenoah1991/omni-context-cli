import * as fs from 'fs/promises';
import * as path from 'path';
import { registerTool } from '../toolExecutor';

export function registerRewriteTool(): void {
  registerTool({
    name: 'rewrite',
    description: `
      Rewrites the entire file. If you need to rewrite large chunks of the file, or are struggling to
      to make a diff edit work, use this as a last resort. Prefer other edit types unless you are
      struggling (have failed multiple times in a row).
      This overwrites the ENTIRE file, so make sure to write everything you intend to overwrite: you
      can't leave anything out by saying e.g. "[The rest of the file stays the same]"
    `,
    parameters: {
      properties: {
        filePath: {type: 'string', description: 'The path to the file'},
        text: {
          type: 'string',
          description: 'The replaced file contents. This will rewrite and replace the entire file',
        },
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

    try {
      await fs.access(absolutePath, fs.constants.R_OK);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${absolutePath}`);
      }
      throw error;
    }

    await fs.writeFile(absolutePath, text, 'utf-8');

    return {content: ''};
  });
}
