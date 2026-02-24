import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const OMX_DIR = path.join(os.homedir(), '.omx');

let cachedProjectId: string | undefined;

function getGitRemoteHash(): string | null {
  try {
    const remote = execSync('git remote get-url origin', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 3000,
    }).trim();
    if (!remote) return null;
    return 'git-' + createHash('sha256').update(remote).digest('hex').slice(0, 16);
  } catch {
    return null;
  }
}

export function getOmxDir(): string {
  return OMX_DIR;
}

export function getLocalOmxDir(): string {
  return path.join(process.cwd(), '.omx');
}

export function getProjectDir(): string {
  if (!cachedProjectId) {
    cachedProjectId = getGitRemoteHash()
      ?? Buffer.from(process.cwd().toLowerCase()).toString('base64url');
  }
  return path.join(OMX_DIR, 'projects', cachedProjectId);
}

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {recursive: true});
  }
}

export function ensureProjectDir(): void {
  ensureDir(getProjectDir());
}

export function getProjectFilePath(filename: string): string {
  return path.join(getProjectDir(), filename);
}

export function getOmxFilePath(filename: string): string {
  return path.join(OMX_DIR, filename);
}

export function getLocalOmxFilePath(filename: string): string {
  return path.join(process.cwd(), '.omx', filename);
}
