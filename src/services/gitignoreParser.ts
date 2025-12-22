import * as fs from 'fs/promises';
import ignore, { Ignore } from 'ignore';
import * as path from 'path';

const DEFAULT_IGNORES = ['.git/', '.idea/', '.vscode/'];

class GitignoreParser {
  private ignoreInstance: Ignore;
  private loadedDirs: Set<string> = new Set();
  private rootDir: string;

  constructor() {
    this.rootDir = process.cwd();
    this.ignoreInstance = ignore();
    this.ignoreInstance.add(DEFAULT_IGNORES);
  }

  private getAncestorDirs(normalizedRelativePath: string): string[] {
    const dirs: string[] = [this.rootDir];
    const parts = normalizedRelativePath.split('/');
    let current = this.rootDir;

    for (let i = 0; i < parts.length - 1; i++) {
      current = path.join(current, parts[i]);
      dirs.push(current);
    }

    return dirs;
  }

  private async loadGitignore(dir: string): Promise<void> {
    if (this.loadedDirs.has(dir)) {
      return;
    }

    this.loadedDirs.add(dir);

    const gitignorePath = path.join(dir, '.gitignore');

    try {
      const content = await fs.readFile(gitignorePath, 'utf-8');
      const relativeDir = path.relative(this.rootDir, dir);
      const normalizedRelativeDir = relativeDir.replace(/\\/g, '/');
      const prefix = normalizedRelativeDir ? normalizedRelativeDir + '/' : '';

      const lines = content.split('\n');
      const transformedLines: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        if (trimmed.startsWith('/')) {
          transformedLines.push(prefix + trimmed.substring(1));
        } else if (trimmed.startsWith('!')) {
          if (trimmed[1] === '/') {
            transformedLines.push('!' + prefix + trimmed.substring(2));
          } else {
            transformedLines.push('!' + prefix + trimmed.substring(1));
          }
        } else {
          transformedLines.push(prefix + trimmed);
        }
      }

      if (transformedLines.length > 0) {
        this.ignoreInstance.add(transformedLines.join('\n'));
      }
    } catch {}
  }

  async isIgnored(filePath: string): Promise<boolean> {
    const relativePath = path.relative(this.rootDir, filePath);
    if (!relativePath || relativePath.startsWith('..')) {
      return false;
    }

    const normalizedPath = relativePath.replace(/\\/g, '/');

    const ancestorDirs = this.getAncestorDirs(normalizedPath);

    for (const dir of ancestorDirs) {
      await this.loadGitignore(dir);
      if (this.ignoreInstance.ignores(normalizedPath)) {
        return true;
      }
    }

    return this.ignoreInstance.ignores(normalizedPath);
  }
}

const globalParser = new GitignoreParser();

export function createAdditionalIgnores(patterns?: string[]): Ignore | null {
  if (!patterns || patterns.length === 0) {
    return null;
  }
  return ignore().add(patterns);
}

export async function isIgnored(
  filePath: string,
  additionalIgnores?: Ignore | null,
): Promise<boolean> {
  const relativePath = path.relative(process.cwd(), filePath);
  if (!relativePath || relativePath.startsWith('..')) {
    return false;
  }

  const normalizedPath = relativePath.replace(/\\/g, '/');

  if (additionalIgnores) {
    if (additionalIgnores.ignores(normalizedPath)) {
      return true;
    }
  }

  return globalParser.isIgnored(filePath);
}
