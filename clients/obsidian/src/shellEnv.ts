import { spawn } from 'child_process';
import { userInfo } from 'os';
import { basename } from 'path';

const TIMEOUT = 10_000;

let shellEnvPromise: Promise<void> | undefined;

export function resolveShellEnv(nodePath?: string): Promise<void> {
  if (process.platform === 'win32') return Promise.resolve();

  if (!shellEnvPromise) {
    shellEnvPromise = doResolve(nodePath).catch(() => {});
  }
  return shellEnvPromise;
}

async function doResolve(nodePath?: string): Promise<void> {
  const shell = getSystemShell();
  const name = basename(shell);
  const shellArgs = name === 'tcsh' || name === 'csh' ? ['-ic'] : ['-i', '-l', '-c'];

  if (nodePath) {
    const mark = Math.random().toString(36).substring(2, 14);
    const cmd = `'${nodePath}' -p '"${mark}" + JSON.stringify(process.env) + "${mark}"'`;
    const stdout = await runShell(shell, [...shellArgs, cmd]);
    const match = new RegExp(mark + '({.*})' + mark).exec(stdout);
    if (match?.[1]) {
      Object.assign(process.env, JSON.parse(match[1]));
    }
  } else {
    const stdout = await runShell(shell, [...shellArgs, 'printf "%s" "$PATH"']);
    if (stdout) {
      process.env.PATH = stdout;
    }
  }
}

function getSystemShell(): string {
  let shell = process.env['SHELL'];

  if (!shell) {
    try {
      shell = userInfo().shell ?? undefined;
    } catch {}
  }

  if (!shell) {
    shell = 'sh';
  }

  if (shell === '/bin/false') {
    shell = '/bin/bash';
  }

  return shell;
}

function runShell(shell: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(shell, args, {detached: true, stdio: ['ignore', 'pipe', 'ignore']});

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('timeout'));
    }, TIMEOUT);

    const buffers: Buffer[] = [];
    child.stdout.on('data', (b: Buffer) => buffers.push(b));
    child.on('error', err => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', () => {
      clearTimeout(timer);
      resolve(Buffer.concat(buffers).toString('utf8'));
    });
  });
}
