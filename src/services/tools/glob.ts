import * as fs from 'fs/promises';
import * as path from 'path';
import { createAdditionalIgnores, isIgnored } from '../gitignoreParser';
import { registerTool } from '../toolExecutor';

async function* walkDirectory(dir: string, rootDir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, {withFileTypes: true});
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (await isIgnored(fullPath)) continue;

    if (entry.isDirectory()) {
      yield* walkDirectory(fullPath, rootDir);
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
    description:
      `Find files matching a glob pattern. Results are sorted by modification time (newest first). Useful for locating files when you know the naming pattern but not the exact location. Supports standard glob syntax: * (any chars), ** (any path), ? (single char). Limited to 100 results. Respects .gitignore.`,
    parameters: {
      properties: {
        pattern: {
          type: 'string',
          description:
            'Glob pattern to match. Examples: "**/*.ts" (all TypeScript files), "src/**/*.test.js" (test files in src), "*.json" (JSON files in current dir)',
        },
        path: {
          type: 'string',
          description:
            'Starting directory for the search. Defaults to current working directory. Use to narrow down the search scope',
        },
      },
      required: ['pattern'],
    },
  }, async (args: {pattern: string; path?: string;}, signal?: AbortSignal) => {
    const {pattern, path: searchPath} = args;

    if (!pattern) {
      throw new Error(
        'Missing required parameter: pattern. Please provide a glob pattern like "**/*.ts" or "*.json".',
      );
    }

    const rootDir = process.cwd();
    const search = searchPath
      ? path.isAbsolute(searchPath) ? searchPath : path.resolve(rootDir, searchPath)
      : rootDir;

    const limit = 100;
    const files: Array<{path: string; mtime: number;}> = [];
    let truncated = false;

    for await (const file of walkDirectory(search, rootDir)) {
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
      output.push(
        `No files match pattern "${pattern}". Try a broader pattern or check if you're in the right directory.`,
      );
    } else {
      output.push(`Found ${files.length} file(s) matching "${pattern}":\n`);
      output.push(...files.map(f => f.path));
      if (truncated) {
        output.push('');
        output.push(
          '[Results limited to 100 files. Use a more specific path or pattern to narrow down.]',
        );
      }
    }

    return {content: output.join('\n')};
  });
}
