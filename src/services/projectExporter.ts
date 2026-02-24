import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ensureProjectDir, getProjectDir } from '../utils/omxPaths';

const EXCLUDED_FILES = new Set(['omx.json']);

export function exportProject(outputPath: string): {count: number; path: string;} {
  const projectDir = getProjectDir();
  const files = fs.readdirSync(projectDir).filter(f =>
    f.endsWith('.json') && !EXCLUDED_FILES.has(f)
  );

  const absOutput = outputPath.endsWith('.tar.gz')
    ? path.resolve(outputPath)
    : path.resolve(outputPath + '.tar.gz');
  const dir = path.dirname(absOutput);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});

  execFileSync('tar', ['czf', absOutput, ...files], {cwd: projectDir});

  return {count: files.length, path: absOutput};
}

export function importProject(inputPath: string): number {
  const projectDir = getProjectDir();
  ensureProjectDir();
  const absInput = path.resolve(inputPath);

  const listing = execFileSync('tar', ['tzf', absInput], {encoding: 'utf-8'});
  const count = listing.trim().split('\n').filter(l => l).length;

  execFileSync('tar', ['xzf', absInput], {cwd: projectDir});

  const indexPath = path.join(projectDir, 'index.json');
  try {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    if (Array.isArray(index)) {
      for (const entry of index) {
        if (typeof entry.path === 'string') {
          entry.path = path.join(projectDir, path.basename(entry.path));
        }
      }
      fs.writeFileSync(indexPath, JSON.stringify(index));
    }
  } catch {}

  return count;
}
