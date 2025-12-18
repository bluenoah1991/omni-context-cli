import * as fs from 'fs/promises';
import * as path from 'path';
import { registerTool } from '../toolExecutor';

async function* walkDirectory(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, {withFileTypes: true});
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        !entry.name.startsWith('.')
        && entry.name !== 'node_modules'
        && entry.name !== 'dist'
        && entry.name !== 'build'
      ) {
        yield* walkDirectory(fullPath);
      }
    } else {
      yield fullPath;
    }
  }
}

function matchGlob(pattern: string, filepath: string): boolean {
  const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filepath);
}

export function registerGlobTool(): void {
  registerTool({
    name: 'glob',
    description: `Fast file pattern matching tool that works with any codebase size.

Usage:
- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns matching file paths sorted by modification time
- Use this tool when you need to find files by name patterns
- You have the capability to call multiple tools in a single response
- It is always better to speculatively perform multiple searches as a batch that are potentially useful

Examples:
- "**/*.ts" - Find all TypeScript files
- "src/**/*.tsx" - Find all TSX files in src directory
- "*.json" - Find all JSON files in current directory`,
    parameters: {
      properties: {
        pattern: {type: 'string', description: 'The glob pattern to match files against'},
        path: {
          type: 'string',
          description:
            'The directory to search in. If not specified, the current working directory will be used. IMPORTANT: Omit this field to use the default directory.',
        },
      },
      required: ['pattern'],
    },
  }, async (args: {pattern: string; path?: string;}) => {
    const {pattern, path: searchPath} = args;

    if (!pattern) {
      throw new Error('pattern is required');
    }

    const search = searchPath
      ? path.isAbsolute(searchPath) ? searchPath : path.resolve(process.cwd(), searchPath)
      : process.cwd();

    const limit = 100;
    const files: Array<{path: string; mtime: number;}> = [];
    let truncated = false;

    for await (const file of walkDirectory(search)) {
      if (files.length >= limit) {
        truncated = true;
        break;
      }

      const relativePath = path.relative(search, file).replace(/\\/g, '/');

      if (matchGlob(pattern, relativePath)) {
        try {
          const stats = await fs.stat(file);
          files.push({path: file, mtime: stats.mtime.getTime()});
        } catch {
        }
      }
    }

    files.sort((a, b) => b.mtime - a.mtime);

    const output: string[] = [];
    if (files.length === 0) {
      output.push('No files found');
    } else {
      output.push(...files.map(f => f.path));
      if (truncated) {
        output.push('');
        output.push('(Results are truncated. Consider using a more specific path or pattern.)');
      }
    }

    return {content: output.join('\n')};
  });
}
