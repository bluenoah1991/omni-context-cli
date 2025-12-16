import * as fs from 'fs/promises';
import * as path from 'path';
import { registerTool } from '../toolExecutor';

export function registerListTool(): void {
  registerTool({
    name: 'list',
    description:
      'Lists directories. Prefer this to Unix tools like `ls`. If no dirPath is provided, lists the cwd',
    parameters: {
      properties: {dirPath: {type: 'string', description: 'Path to the directory'}},
      required: [],
    },
  }, async (args?: {dirPath?: string;}) => {
    const dirPath = args?.dirPath || process.cwd();

    const absolutePath = path.isAbsolute(dirPath) ? dirPath : path.resolve(process.cwd(), dirPath);

    let stats;
    try {
      stats = await fs.stat(absolutePath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`No such directory: ${absolutePath}`);
      }
      throw error;
    }

    if (!stats.isDirectory()) {
      throw new Error(`${absolutePath} is not a directory`);
    }

    const entries = await fs.readdir(absolutePath, {withFileTypes: true});

    const formattedEntries = entries.map(entry =>
      JSON.stringify({name: entry.name, isDirectory: entry.isDirectory(), isFile: entry.isFile()})
    );

    return {content: formattedEntries.join('\n')};
  });
}
