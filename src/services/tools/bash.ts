import { spawn } from 'child_process';
import * as path from 'path';
import { checkWSL, normalizePath } from '../../utils/wsl';
import { createTask } from '../taskManager';
import { registerTool } from '../toolExecutor';

const MAX_OUTPUT_LENGTH = 30000;
const DEFAULT_TIMEOUT = 120000;

export function registerBashTool(): void {
  registerTool(
    {
      name: 'Bash',
      builtin: true,
      description:
        `Run bash commands in your terminal. Great for builds, installs, CLI tools, and system tasks. Save this for when specialized tools won't work. Prefer read, write, edit, glob, or grep when you can. Windows users automatically get WSL bash if it's available. Output is returned to you, and long-running commands get cut off at the timeout. Commands run without a PTY, so interactive commands (vim, nano, less, etc.) will hang. Use non-interactive flags or ask the user to run them manually.`,
      formatCall: (args: Record<string, unknown>) => String(args.command || ''),
      parameters: {
        properties: {
          command: {
            type: 'string',
            description:
              'Bash command to run. Pipes, redirects, and chains all work. For example: "npm install", "git status", or "ls -la | grep .ts"',
          },
          timeout: {
            type: 'number',
            description:
              'Max runtime in milliseconds. Default: 120000 (2 min). Increase this for builds or installs.',
          },
          workdir: {
            type: 'string',
            description:
              'Where to run the command. Can be a relative or absolute path. Defaults to the current directory.',
          },
          background: {
            type: 'boolean',
            description:
              'Run in the background? Returns a task ID right away. Perfect for servers, watch tasks, or daemons. Default: false.',
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
        throw new Error('You need to provide a command. What do you want to run?');
      }
      if (timeout !== undefined && timeout < 0) {
        throw new Error(
          `Timeout can't be negative (got ${timeout}ms). Try a positive value, like 60000 for a minute.`,
        );
      }

      const cwd = workdir ? path.resolve(await normalizePath(workdir)) : process.cwd();

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
            new Error(`Timed out after ${timeout}ms. Need more time? Increase the timeout value.`),
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
              + `\n\n[Output truncated at ${MAX_OUTPUT_LENGTH} chars out of ${output.length} total]`;
          }

          if (code !== 0) {
            reject(
              new Error(
                `Exited with code ${code}. Something went wrong.\n\n${output || '(no output)'}`,
              ),
            );
          } else {
            const result = output.trim() || 'Finished with no output';
            resolve({result: result, displayText: 'Command finished'});
          }
        });
      });
    },
  );
}
