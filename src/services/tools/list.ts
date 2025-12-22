import * as fs from 'fs/promises';
import { Ignore } from 'ignore';
import * as path from 'path';
import { createAdditionalIgnores, isIgnored } from '../gitignoreParser';
import { registerTool } from '../toolExecutor';

const LIMIT = 100;

async function* walkDirectory(
  dir: string,
  rootDir: string,
  additionalIgnores: Ignore | null,
): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, {withFileTypes: true});
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (await isIgnored(fullPath, additionalIgnores)) continue;

    if (entry.isDirectory()) {
      yield* walkDirectory(fullPath, rootDir, additionalIgnores);
    } else {
      yield path.relative(rootDir, fullPath);
    }
  }
}

export function registerListTool(): void {
  registerTool({
    name: 'list',
    description:
      `List files in a directory with a tree-like structure. Respects .gitignore and common ignore patterns (.git, .idea, .vscode). Limited to 100 files to keep output manageable. Use this to explore project structure before reading specific files. For finding files by pattern, use 'glob' instead.`,
    parameters: {
      properties: {
        path: {
          type: 'string',
          description:
            'Directory to list. Defaults to current working directory. Can be relative or absolute',
        },
        ignore: {
          type: 'array',
          items: {type: 'string'},
          description:
            'Additional patterns to ignore (glob-style). Example: ["*.log", "temp/", "*.bak"]',
        },
      },
      required: [],
    },
  }, async (args?: {path?: string; ignore?: string[];}, signal?: AbortSignal) => {
    const rootDir = process.cwd();
    const searchPath = path.resolve(rootDir, args?.path || '.');

    let stats;
    try {
      stats = await fs.stat(searchPath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(
          `Directory not found: ${searchPath}. Check if the path exists or try a parent directory.`,
        );
      }
      throw error;
    }

    if (!stats.isDirectory()) {
      throw new Error(
        `Not a directory: ${searchPath}. This path points to a file. Use 'read' to view file contents.`,
      );
    }

    const additionalIgnores = createAdditionalIgnores(args?.ignore);

    const files: string[] = [];

    for await (const file of walkDirectory(searchPath, rootDir, additionalIgnores)) {
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
