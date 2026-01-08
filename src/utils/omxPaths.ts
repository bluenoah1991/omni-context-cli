import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const OMX_DIR = path.join(os.homedir(), '.omx');

export function getOmxDir(): string {
  return OMX_DIR;
}

export function getLocalOmxDir(): string {
  return path.join(process.cwd(), '.omx');
}

export function getProjectDir(): string {
  const encoded = Buffer.from(process.cwd()).toString('base64url');
  return path.join(OMX_DIR, 'projects', encoded);
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
