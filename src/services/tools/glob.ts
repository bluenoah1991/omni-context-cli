import { existsSync } from 'fs';
import { glob } from 'glob';
import * as path from 'path';
import { isIgnored } from '../gitignoreParser';
import { registerTool } from '../toolExecutor';
import { getGlobExcludes } from './ignorePatterns';

export function registerGlobTool(): void {
  registerTool({
    name: 'glob',
    description:
      `Find files matching a glob pattern. Useful for locating files when you know the naming pattern but not the exact location. Supports standard glob syntax: * (any chars), ** (any path), ? (single char). Limited to 100 results. Respects .gitignore.`,
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
    const fullPath = path.join(searchDir, pattern);
    if (existsSync(fullPath)) {
      searchPattern = glob.escape(pattern);
    }

    const limit = 100;
    const files: string[] = [];
    let truncated = false;

    for await (
      const result of glob.iterate(searchPattern, {
        cwd: searchDir,
        nodir: true,
        nocase,
        dot: true,
        ignore: getGlobExcludes(),
        follow: false,
        signal,
      })
    ) {
      if (await isIgnored(result)) {
        continue;
      }

      if (files.length >= limit) {
        truncated = true;
        break;
      }

      files.push(result);
    }

    const output: string[] = [];
    if (files.length === 0) {
      output.push(
        `No files match pattern "${pattern}". Try a broader pattern or check if you're in the right directory.`,
      );
    } else {
      output.push(`Found ${files.length} file(s) matching "${pattern}":\n`);
      output.push(...files);
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
