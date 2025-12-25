import { existsSync } from 'fs';
import { glob } from 'glob';
import * as path from 'path';
import { isIgnored } from '../gitignoreParser';
import { registerTool } from '../toolExecutor';
import { getGlobExcludes } from './ignorePatterns';

const MAX_FILES = 100;

export function registerGlobTool(): void {
  registerTool({
    name: 'glob',
    description:
      `Find files by pattern. Great for locating files when you know the name pattern but not the location, finding all files of a certain type, or exploring directory structure. Standard glob syntax: * (matches anything), ** (matches any path), ? (matches one char). Capped at 100 results. Respects .gitignore. For directories: "path/*" (direct children) or "path/**/*" (recursive, everything).`,
    formatCall: (args: Record<string, unknown>) => String(args.pattern || ''),
    parameters: {
      properties: {
        pattern: {
          type: 'string',
          description:
            'Glob pattern. For example: "**/*.ts" (all TS files), "src/**/*.test.js" (tests in src), or "*.json" (JSON in current dir)',
        },
        path: {
          type: 'string',
          description:
            'Where to start searching. Default: current directory. Use this to narrow the search scope.',
        },
        nocase: {type: 'boolean', description: 'Case-insensitive matching? Default: false.'},
      },
      required: ['pattern'],
    },
  }, async (args: {pattern: string; path?: string; nocase?: boolean;}, signal?: AbortSignal) => {
    const {pattern, path: searchPath, nocase = false} = args;

    if (!pattern) {
      throw new Error('You need to provide a pattern. Try something like "**/*.ts" or "*.json".');
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

      if (files.length >= MAX_FILES) {
        truncated = true;
        break;
      }

      files.push(result);
    }

    const output: string[] = [];
    if (files.length === 0) {
      output.push(
        `No matches found for "${pattern}". Try a broader pattern or check your location.`,
      );
    } else {
      output.push(`Found ${files.length} file(s) matching "${pattern}":\n`);
      output.push(...files);
      if (truncated) {
        output.push('');
        output.push(`[Capped at ${MAX_FILES} files. Be more specific with your pattern or path.]`);
      }
    }

    return {
      result: output.join('\n'),
      displayText: files.length > 0 ? `Found ${files.length} files` : 'Search complete',
    };
  });
}
