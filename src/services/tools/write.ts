import * as fs from 'fs/promises';
import * as path from 'path';
import { registerTool } from '../toolExecutor';

export function registerWriteTool(): void {
  registerTool({
    name: 'write',
    description: `Writes a file to the local filesystem.

Usage:
- This tool will overwrite the existing file if there is one at the provided path
- If this is an existing file, you MUST use the Read tool first to read the file's contents
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required
- NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested
- Only use emojis if the user explicitly requests it`,
    parameters: {
      properties: {
        content: {type: 'string', description: 'The content to write to the file'},
        filePath: {
          type: 'string',
          description: 'The absolute path to the file to write (must be absolute, not relative)',
        },
      },
      required: ['content', 'filePath'],
    },
  }, async (args: {content: string; filePath: string;}) => {
    const {content, filePath} = args;

    if (!filePath) {
      throw new Error('filePath is required');
    }
    if (content === undefined) {
      throw new Error('content is required');
    }

    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    const dir = path.dirname(absolutePath);
    await fs.mkdir(dir, {recursive: true});

    await fs.writeFile(absolutePath, content, 'utf-8');

    return {content: 'File written successfully'};
  });
}
