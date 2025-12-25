import { spawn } from 'child_process';
import * as path from 'path';
import { createTask } from '../taskManager';
import { registerTool } from '../toolExecutor';

const MAX_OUTPUT_LENGTH = 30000;
const DEFAULT_TIMEOUT = 120000;

let wslAvailable: boolean | null = null;

async function checkWSL(): Promise<boolean> {
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

export function registerBashTool(): void {
  registerTool(
    {
      name: 'bash',
      description:
        `Run bash commands in your terminal. Good for builds, installs, CLI tools, and system stuff. Save it for when specialized tools won't cut it—prefer read, write, edit, glob, or grep when you can. Windows users get WSL bash automatically if it's around. Output comes back to you. Long-runners get cut off at timeout.`,
      formatCall: (args: Record<string, unknown>) => String(args.command || ''),
      parameters: {
        properties: {
          command: {
            type: 'string',
            description:
              'Bash command to run. Pipes, redirects, chains—all good. Like: "npm install", "git status", "ls -la | grep .ts"',
          },
          timeout: {
            type: 'number',
            description:
              'Max runtime in milliseconds. Default: 120000 (2 min). Bump it up for builds or installs',
          },
          workdir: {
            type: 'string',
            description:
              'Where to run the command. Relative or absolute path. Defaults to current directory',
          },
          background: {
            type: 'boolean',
            description:
              'Run in the background? Returns a task ID right away. Perfect for servers, watch tasks, or daemons. Default: false',
          },
        },
        required: ['command'],
      },
    },
    async (
      args: {command: string; timeout?: number; workdir?: string; background?: boolean;},
      signal?: AbortSignal,
    ) => {
      const {command, timeout = DEFAULT_TIMEOUT, workdir, background = false} = args;

      if (!command) {
        throw new Error('Need a command here. What do you want to run?');
      }
      if (timeout !== undefined && timeout < 0) {
        throw new Error(
          `Timeout can't be negative (got ${timeout}ms). Try something positive, like 60000 for a minute.`,
        );
      }

      const cwd = workdir ? path.resolve(process.cwd(), workdir) : process.cwd();

      const useWSL = await checkWSL();
      const shell = useWSL
        ? 'wsl.exe'
        : (process.platform === 'win32' ? 'powershell.exe' : '/bin/bash');
      const shellArgs = useWSL
        ? ['bash', '-c', command]
        : (process.platform === 'win32' ? ['-Command', command] : ['-c', command]);

      if (background) {
        const child = spawn(shell, shellArgs, {
          cwd,
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
          detached: false,
        });

        const taskId = createTask(child);

        return {
          result:
            `Task ${taskId} is running in the background\nCommand: ${command}\nCheck output with bashOutput tool.`,
          displayText: `Task ${taskId} running`,
        };
      }

      return new Promise((resolve, reject) => {
        const child = spawn(shell, shellArgs, {
          cwd,
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        });

        let stdout = '';
        let stderr = '';
        let killed = false;

        const timeoutId = setTimeout(() => {
          killed = true;
          child.kill();
          reject(
            new Error(
              `Timed out after ${timeout}ms and got killed. Need more time? Bump up the timeout.`,
            ),
          );
        }, timeout);

        if (signal) {
          signal.addEventListener('abort', () => {
            if (!killed) {
              killed = true;
              clearTimeout(timeoutId);
              child.kill();
              reject(new Error('Aborted on request'));
            }
          });
        }

        child.stdout.on('data', data => {
          stdout += data.toString();
        });

        child.stderr.on('data', data => {
          stderr += data.toString();
        });

        child.on('error', error => {
          clearTimeout(timeoutId);
          if (!killed) {
            reject(
              new Error(
                `Couldn't start command: ${error.message}. Does it exist? Is it executable?`,
              ),
            );
          }
        });

        child.on('close', code => {
          clearTimeout(timeoutId);
          if (killed) return;

          let output = stdout;
          if (stderr) {
            output += (output ? '\n\n' : '') + `STDERR:\n${stderr}`;
          }

          if (output.length > MAX_OUTPUT_LENGTH) {
            output = output.substring(0, MAX_OUTPUT_LENGTH)
              + `\n\n[Truncated at ${MAX_OUTPUT_LENGTH} chars of ${output.length}]`;
          }

          if (code !== 0) {
            reject(
              new Error(
                `Exited with code ${code}. Something went wrong.\n\n${output || '(no output)'}`,
              ),
            );
          } else {
            const result = output.trim() || 'Done—no output';
            const lines = result.split('\n').length;
            resolve({result: result, displayText: `Done (${lines} lines)`});
          }
        });
      });
    },
  );
}
