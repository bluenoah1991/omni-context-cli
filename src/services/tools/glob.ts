import * as fs from 'fs/promises';
import { glob } from 'glob';
import * as path from 'path';
import { isIgnored } from '../gitignoreParser';
import { registerTool } from '../toolExecutor';
import { getGlobExcludes } from './ignorePatterns';

interface GlobPath {
  fullpath(): string;
  mtimeMs?: number;
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
        nocase: {
          type: 'boolean',
          description: 'Perform a case-insensitive match. Defaults to false (case-sensitive)',
        },
      },
      required: ['pattern'],
    },
  }, async (args: {pattern: string; path?: string; nocase?: boolean;}, signal?: AbortSignal) => {
    const {pattern, path: searchPath, nocase = false} = args;

    if (!pattern) {
      throw new Error(
        'Missing required parameter: pattern. Please provide a glob pattern like "**/*.ts" or "*.json".',
      );
    }

    const rootDir = process.cwd();
    const searchDir = searchPath
      ? path.isAbsolute(searchPath) ? searchPath : path.resolve(rootDir, searchPath)
      : rootDir;

    let searchPattern = pattern;
    try {
      const stats = await fs.stat(path.resolve(searchDir, pattern));
      if (stats.isFile()) {
        searchPattern = glob.escape(pattern);
      }
    } catch {}

    const results = await glob(searchPattern, {
      cwd: searchDir,
      withFileTypes: true,
      nodir: true,
      stat: true,
      nocase,
      dot: true,
      ignore: getGlobExcludes(),
      follow: false,
      signal,
    });

    const limit = 100;
    const files: GlobPath[] = [];

    for (const result of results) {
      if (await isIgnored(result.fullpath())) {
        continue;
      }

      files.push(result);

      if (files.length >= limit) {
        break;
      }
    }

    files.sort((a, b) => (b.mtimeMs ?? 0) - (a.mtimeMs ?? 0));

    const truncated = results.length > limit;

    const output: string[] = [];
    if (files.length === 0) {
      output.push(
        `No files match pattern "${pattern}". Try a broader pattern or check if you're in the right directory.`,
      );
    } else {
      output.push(`Found ${files.length} file(s) matching "${pattern}":\n`);
      output.push(...files.map(f => f.fullpath()));
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
