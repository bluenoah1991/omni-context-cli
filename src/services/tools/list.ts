import * as fs from 'fs/promises';
import * as path from 'path';
import { registerTool } from '../toolExecutor';

const IGNORE_PATTERNS = [
  'node_modules/',
  '__pycache__/',
  '.git/',
  'dist/',
  'build/',
  'target/',
  'vendor/',
  'bin/',
  'obj/',
  '.idea/',
  '.vscode/',
  '.cache/',
  'cache/',
  'logs/',
  '.venv/',
  'venv/',
  'env/',
];

const LIMIT = 100;

async function* walkDirectory(
  dir: string,
  ignorePatterns: string[],
  baseDir?: string,
): AsyncGenerator<string> {
  const base = baseDir || dir;
  const entries = await fs.readdir(dir, {withFileTypes: true});
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(base, fullPath);

    const shouldIgnore = ignorePatterns.some(pattern =>
      relativePath.includes(pattern.replace('/', ''))
    );
    if (shouldIgnore) continue;

    if (entry.isDirectory()) {
      yield* walkDirectory(fullPath, ignorePatterns, base);
    } else {
      yield relativePath;
    }
  }
}

export function registerListTool(): void {
  registerTool({
    name: 'list',
    description:
      `Lists files and directories in a given path. The path parameter must be absolute; omit it to use the current working directory. You can optionally provide an array of glob patterns to ignore with the ignore parameter. You should generally prefer the Glob and Grep tools, if you know which directories to search.`,
    parameters: {
      properties: {
        path: {
          type: 'string',
          description:
            'The absolute path to the directory to list (must be absolute, not relative). Optional.',
        },
        ignore: {
          type: 'array',
          items: {type: 'string'},
          description: 'List of glob patterns to ignore',
        },
      },
      required: [],
    },
  }, async (args?: {path?: string; ignore?: string[];}) => {
    const searchPath = path.resolve(process.cwd(), args?.path || '.');

    let stats;
    try {
      stats = await fs.stat(searchPath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`No such directory: ${searchPath}`);
      }
      throw error;
    }

    if (!stats.isDirectory()) {
      throw new Error(`${searchPath} is not a directory`);
    }

    const ignoreGlobs = [...IGNORE_PATTERNS, ...(args?.ignore || [])];
    const files: string[] = [];

    for await (const file of walkDirectory(searchPath, ignoreGlobs)) {
      files.push(file);
      if (files.length >= LIMIT) break;
    }

    const dirs = new Set<string>();
    const filesByDir = new Map<string, string[]>();

    for (const file of files) {
      const dir = path.dirname(file);
      const parts = dir === '.' ? [] : dir.split(path.sep);

      for (let i = 0; i <= parts.length; i++) {
        const dirPath = i === 0 ? '.' : parts.slice(0, i).join(path.sep);
        dirs.add(dirPath);
      }

      if (!filesByDir.has(dir)) filesByDir.set(dir, []);
      filesByDir.get(dir)!.push(path.basename(file));
    }

    function renderDir(dirPath: string, depth: number): string {
      const indent = '  '.repeat(depth);
      let output = '';

      if (depth > 0) {
        output += `${indent}${path.basename(dirPath)}/\n`;
      }

      const childIndent = '  '.repeat(depth + 1);
      const children = Array.from(dirs).filter(d => path.dirname(d) === dirPath && d !== dirPath)
        .sort();

      for (const child of children) {
        output += renderDir(child, depth + 1);
      }

      const dirFiles = filesByDir.get(dirPath) || [];
      for (const file of dirFiles.sort()) {
        output += `${childIndent}${file}\n`;
      }

      return output;
    }

    const output = `${searchPath}${path.sep}\n` + renderDir('.', 0);

    return {content: output};
  });
}
