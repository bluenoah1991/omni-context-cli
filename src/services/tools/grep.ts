import * as fs from 'fs/promises';
import * as path from 'path';
import { registerTool } from '../toolExecutor';

const MAX_LINE_LENGTH = 2000;

async function* walkDirectory(dir: string, include?: string): AsyncGenerator<string> {
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
        yield* walkDirectory(fullPath, include);
      }
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
    description: `Fast content search tool that works with any codebase size.

Usage:
- Searches file contents using regular expressions
- Supports full regex syntax (e.g. "log.*Error", "function\\s+\\w+", etc.)
- Filter files by pattern with the include parameter (e.g. "*.js", "*.{ts,tsx}")
- Returns file paths and line numbers with at least one match sorted by modification time
- Use this tool when you need to find files containing specific patterns

Examples:
- pattern: "function.*test" - Find all functions with 'test' in name
- pattern: "import.*React" - Find all React imports
- pattern: "TODO|FIXME" - Find all TODOs or FIXMEs
- include: "*.ts" - Only search TypeScript files
- include: "*.{js,ts}" - Search both JavaScript and TypeScript files`,
    parameters: {
      properties: {
        pattern: {type: 'string', description: 'The regex pattern to search for in file contents'},
        path: {
          type: 'string',
          description: 'The directory to search in. Defaults to the current working directory.',
        },
        include: {
          type: 'string',
          description: 'File pattern to include in the search (e.g. "*.js", "*.{ts,tsx}")',
        },
      },
      required: ['pattern'],
    },
  }, async (args: {pattern: string; path?: string; include?: string;}) => {
    const {pattern, path: searchPath, include} = args;

    if (!pattern) {
      throw new Error('pattern is required');
    }

    const search = searchPath
      ? path.isAbsolute(searchPath) ? searchPath : path.resolve(process.cwd(), searchPath)
      : process.cwd();

    const regex = new RegExp(pattern, 'g');
    const matches: Array<{path: string; lineNum: number; lineText: string; modTime: number;}> = [];
    const limit = 100;

    for await (const file of walkDirectory(search, include)) {
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
      return {content: 'No files found'};
    }

    const outputLines = [`Found ${matches.length} matches`];
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
      outputLines.push('(Results are truncated. Consider using a more specific path or pattern.)');
    }

    return {content: outputLines.join('\n')};
  });
}
