import * as fs from 'fs/promises';
import * as path from 'path';
import { registerTool } from '../toolExecutor';

export function registerEditTool(): void {
  registerTool({
    name: 'edit',
    description:
      'Applies a search/replace edit to a file. This should be your default tool to edit existing files.',
    parameters: {
      properties: {
        filePath: {type: 'string', description: 'The path to the file'},
        search: {
          type: 'string',
          description: `
            The search string to replace. Must EXACTLY match the text you intend to replace, including
            whitespace, punctuation, etc. Make sure to give a few lines of context above and below so you
            don't accidentally replace a different matching substring in the same file.
          `,
        },
        replace: {type: 'string', description: 'The string you want to insert into the file'},
      },
      required: ['filePath', 'search', 'replace'],
    },
  }, async (args: {filePath: string; search: string; replace: string;}) => {
    const {filePath, search, replace} = args;

    if (!filePath) {
      throw new Error('filePath is required');
    }
    if (search === undefined) {
      throw new Error('search is required');
    }
    if (replace === undefined) {
      throw new Error('replace is required');
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

    if (!content.includes(search)) {
      throw new Error(`
Could not find search string in file ${absolutePath}: ${search}
This is likely an error in your formatting. The search string must EXACTLY match, including
whitespace and punctuation.
      `.trim());
    }

    const newContent = content.replace(search, replace);

    await fs.writeFile(absolutePath, newContent, 'utf-8');

    return {content: ''};
  });
}
