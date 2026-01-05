import { spawn } from 'child_process';

let wslAvailable: boolean | null = null;

export async function checkWSL(): Promise<boolean> {
  if (wslAvailable !== null) return wslAvailable;
  if (process.platform !== 'win32') {
    wslAvailable = false;
    return false;
  }
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn('wsl.exe', ['--status'], {stdio: 'ignore', windowsHide: true});
      child.on('error', reject);
      child.on('close', code => (code === 0 ? resolve() : reject()));
    });
    wslAvailable = true;
    return true;
  } catch {
    wslAvailable = false;
    return false;
  }
}

function isLinuxPath(p: string): boolean {
  return p.startsWith('/') && !p.startsWith('//');
}

function wslPathToWindows(p: string): string {
  const match = p.match(/^\/mnt\/([a-zA-Z])(\/.*)?$/);
  if (!match) {
    throw new Error(`Can't access "${p}" from Windows. Only /mnt/<drive>/ paths are supported.`);
  }
  const drive = match[1].toUpperCase();
  const rest = match[2] ? match[2].replace(/\//g, '\\') : '\\';
  return `${drive}:${rest}`;
}

export async function normalizePath(p: string): Promise<string> {
  if (process.platform !== 'win32') return p;
  if (!isLinuxPath(p)) return p;
  return wslPathToWindows(p);
}
