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
      `Find files by pattern. Good for locating files when you know the name pattern but not where they live, finding all files of a type, or exploring structure. Standard glob: * (anything), ** (any path), ? (one char). Caps at 100 results. Respects .gitignore. For a directory: "path/*" (direct kids) or "path/**/*" (recursive, everything).`,
    formatCall: (args: Record<string, unknown>) => String(args.pattern || ''),
    parameters: {
      properties: {
        pattern: {
          type: 'string',
          description:
            'Glob pattern. Like: "**/*.ts" (all TS files), "src/**/*.test.js" (tests in src), "*.json" (JSON in current dir)',
        },
        path: {
          type: 'string',
          description: 'Where to start searching. Default: current directory. Narrows the scope',
        },
        nocase: {type: 'boolean', description: 'Case-insensitive? Default: false'},
      },
      required: ['pattern'],
    },
  }, async (args: {pattern: string; path?: string; nocase?: boolean;}, signal?: AbortSignal) => {
    const {pattern, path: searchPath, nocase = false} = args;

    if (!pattern) {
      throw new Error('Need a pattern. Try something like "**/*.ts" or "*.json".');
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
      output.push(`No matches for "${pattern}". Try going broader or check your location.`);
    } else {
      output.push(`Found ${files.length} file(s) matching "${pattern}":\n`);
      output.push(...files);
      if (truncated) {
        output.push('');
        output.push('[Capped at 100 files. Be more specific with your pattern or path.]');
      }
    }

    return {
      result: output.join('\n'),
      displayText: files.length > 0 ? `Found ${files.length} files` : 'Search complete',
    };
  });
}
