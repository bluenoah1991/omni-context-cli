import * as fs from 'fs/promises';
import * as path from 'path';
import { createAdditionalIgnores, isIgnored } from '../gitignoreParser';
import { registerTool } from '../toolExecutor';

const MAX_LINE_LENGTH = 2000;

async function* walkDirectory(
  dir: string,
  rootDir: string,
  include?: string,
): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, {withFileTypes: true});
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (await isIgnored(fullPath)) continue;

    if (entry.isDirectory()) {
      yield* walkDirectory(fullPath, rootDir, include);
    } else {
      if (!include || matchPattern(entry.name, include)) {
        yield fullPath;
      }
    }
  }
}

function matchPattern(filename: string, pattern: string): boolean {
  const patterns = pattern.includes(',')
    ? pattern.replace(/[{}]/g, '').split(',').map(p => p.trim())
    : [pattern];

  return patterns.some(p => {
    const regexPattern = p.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filename);
  });
}

export function registerGrepTool(): void {
  registerTool({
    name: 'grep',
    description:
      `Search for text patterns inside files using regex. Returns matching lines with file paths and line numbers. Results are sorted by file modification time (newest first). Great for finding function definitions, variable usages, or any text pattern across the codebase. Limited to 100 matches. Respects .gitignore.`,
    parameters: {
      properties: {
        pattern: {
          type: 'string',
          description:
            'Regex pattern to search for. Examples: "function\\s+\\w+", "TODO|FIXME", "import.*from". Case-sensitive by default',
        },
        path: {
          type: 'string',
          description:
            'Directory to search in. Defaults to current working directory. Use to limit search scope',
        },
        include: {
          type: 'string',
          description:
            'Filter by filename pattern. Examples: "*.ts" (TypeScript only), "*.{js,jsx}" (JS and JSX), "test_*.py" (Python test files)',
        },
      },
      required: ['pattern'],
    },
  }, async (args: {pattern: string; path?: string; include?: string;}, signal?: AbortSignal) => {
    const {pattern, path: searchPath, include} = args;

    if (!pattern) {
      throw new Error(
        'Missing required parameter: pattern. Please provide a regex pattern to search for.',
      );
    }

    const rootDir = process.cwd();
    const search = searchPath
      ? path.isAbsolute(searchPath) ? searchPath : path.resolve(rootDir, searchPath)
      : rootDir;

    const regex = new RegExp(pattern, 'g');
    const matches: Array<{path: string; lineNum: number; lineText: string; modTime: number;}> = [];
    const limit = 100;

    for await (const file of walkDirectory(search, rootDir, include)) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');
        const stats = await fs.stat(file);

        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            matches.push({
              path: file,
              lineNum: i + 1,
              lineText: lines[i],
              modTime: stats.mtime.getTime(),
            });

            if (matches.length >= limit) break;
          }
          regex.lastIndex = 0;
        }

        if (matches.length >= limit) break;
      } catch {
      }
    }

    matches.sort((a, b) => b.modTime - a.modTime);

    if (matches.length === 0) {
      return {
        content:
          `No matches found for pattern "${pattern}". Try a different pattern, check regex syntax, or expand the search path.`,
      };
    }

    const outputLines = [`Found ${matches.length} match(es) for "${pattern}":\n`];
    let currentFile = '';

    for (const match of matches) {
      if (currentFile !== match.path) {
        if (currentFile !== '') {
          outputLines.push('');
        }
        currentFile = match.path;
        outputLines.push(`${match.path}:`);
      }

      const truncatedLineText = match.lineText.length > MAX_LINE_LENGTH
        ? match.lineText.substring(0, MAX_LINE_LENGTH) + '...'
        : match.lineText;
      outputLines.push(`  Line ${match.lineNum}: ${truncatedLineText}`);
    }

    if (matches.length >= limit) {
      outputLines.push('');
      outputLines.push(
        '[Results limited to 100 matches. Use a more specific pattern or path to narrow down.]',
      );
    }

    return {content: outputLines.join('\n')};
  });
}
