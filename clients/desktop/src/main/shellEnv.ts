import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { userInfo } from 'os';
import { basename } from 'path';

const TIMEOUT = 10_000;

let shellEnvPromise: Promise<typeof process.env> | undefined;

export async function resolveShellEnv(): Promise<void> {
  if (process.platform === 'win32') return;

  if (!shellEnvPromise) {
    shellEnvPromise = new Promise(async (resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Unable to resolve your shell environment in a reasonable time.'));
      }, TIMEOUT);

      try {
        resolve(await doResolveUnixShellEnv());
      } catch (error) {
        reject(error);
      } finally {
        clearTimeout(timer);
      }
    });
  }

  try {
    const env = await shellEnvPromise;
    if (env && Object.keys(env).length > 0) {
      Object.assign(process.env, env);
    }
  } catch {}
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

async function doResolveUnixShellEnv(): Promise<typeof process.env> {
  const runAsNode = process.env['ELECTRON_RUN_AS_NODE'];
  const noAttach = process.env['ELECTRON_NO_ATTACH_CONSOLE'];

  const mark = randomUUID().replace(/-/g, '').substring(0, 12);
  const regex = new RegExp(mark + '({.*})' + mark);

  const env = {...process.env, ELECTRON_RUN_AS_NODE: '1', ELECTRON_NO_ATTACH_CONSOLE: '1'};

  const systemShell = getSystemShell();

  return new Promise<typeof process.env>((resolve, reject) => {
    const name = basename(systemShell);
    let command: string, shellArgs: Array<string>;
    const extraArgs = '';
    if (/^(?:pwsh|powershell)(?:-preview)?$/.test(name)) {
      command =
        `& '${process.execPath}' ${extraArgs} -p '''${mark}'' + JSON.stringify(process.env) + ''${mark}'''`;
      shellArgs = ['-Login', '-Command'];
    } else if (name === 'nu') {
      command =
        `^'${process.execPath}' ${extraArgs} -p '"${mark}" + JSON.stringify(process.env) + "${mark}"'`;
      shellArgs = ['-i', '-l', '-c'];
    } else if (name === 'xonsh') {
      command = `import os, json; print("${mark}", json.dumps(dict(os.environ)), "${mark}")`;
      shellArgs = ['-i', '-l', '-c'];
    } else {
      command =
        `'${process.execPath}' ${extraArgs} -p '"${mark}" + JSON.stringify(process.env) + "${mark}"'`;

      if (name === 'tcsh' || name === 'csh') {
        shellArgs = ['-ic'];
      } else {
        shellArgs = ['-i', '-l', '-c'];
      }
    }

    const child = spawn(systemShell, [...shellArgs, command], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    });

    child.on('error', err => {
      reject(err);
    });

    const buffers: Buffer[] = [];
    child.stdout.on('data', (b: Buffer) => buffers.push(b));

    const stderr: Buffer[] = [];
    child.stderr.on('data', (b: Buffer) => stderr.push(b));

    child.on('close', (code, signal) => {
      const raw = Buffer.concat(buffers).toString('utf8');

      if (code || signal) {
        return reject(
          new Error(`Unexpected exit code from spawned shell (code ${code}, signal ${signal})`),
        );
      }

      const match = regex.exec(raw);
      const rawStripped = match ? match[1] : '{}';

      try {
        const env = JSON.parse(rawStripped);

        if (runAsNode) {
          env['ELECTRON_RUN_AS_NODE'] = runAsNode;
        } else {
          delete env['ELECTRON_RUN_AS_NODE'];
        }

        if (noAttach) {
          env['ELECTRON_NO_ATTACH_CONSOLE'] = noAttach;
        } else {
          delete env['ELECTRON_NO_ATTACH_CONSOLE'];
        }

        delete env['XDG_RUNTIME_DIR'];

        resolve(env);
      } catch (err) {
        reject(err);
      }
    });
  });
}
