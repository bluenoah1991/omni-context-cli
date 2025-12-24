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
        `Execute bash commands in the terminal. Use this for: running build scripts, installing dependencies, executing CLI tools, or any system-level operations. Prefer using dedicated tools (like read, write, edit, glob, grep) when possible, and use bash only when those tools are insufficient. On Windows, automatically uses WSL bash if available. The output is captured and returned. Long-running commands will be terminated after the timeout.`,
      formatCall: (args: Record<string, unknown>) => String(args.command || ''),
      parameters: {
        properties: {
          command: {
            type: 'string',
            description:
              'The bash command to execute. Can include pipes, redirects, and chained commands. Examples: "npm install", "git status", "ls -la | grep .ts"',
          },
          timeout: {
            type: 'number',
            description:
              'Max execution time in milliseconds. Defaults to 120000 (2 minutes). Set higher for long operations like builds or installations',
          },
          workdir: {
            type: 'string',
            description:
              'Working directory for the command. Can be relative (resolved from current dir) or absolute. Defaults to current working directory',
          },
          background: {
            type: 'boolean',
            description:
              'Whether to run the command in the background. When true, returns a task ID immediately without waiting for completion. Useful for long-running commands like dev servers, watch tasks, or daemon processes. Defaults to false.',
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
        throw new Error(
          'Missing required parameter: command. Please provide a bash command to execute.',
        );
      }
      if (timeout !== undefined && timeout < 0) {
        throw new Error(
          `Invalid timeout: ${timeout}ms. Timeout must be a positive number (e.g., 60000 for 1 minute).`,
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
            `Background task started with ID: ${taskId}\nCommand: ${command}\nUse the 'bashOutput' tool to check the output.`,
          displayText: `Background task started: ${taskId}`,
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
              `Command timed out after ${timeout}ms. The process was forcefully terminated. Consider increasing the timeout for long-running operations.`,
            ),
          );
        }, timeout);

        if (signal) {
          signal.addEventListener('abort', () => {
            if (!killed) {
              killed = true;
              clearTimeout(timeoutId);
              child.kill();
              reject(new Error('Command was aborted by user request'));
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
                `Failed to start command: ${error.message}. Check if the command exists and is executable.`,
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
              + `\n\n[Output truncated at ${MAX_OUTPUT_LENGTH} chars. Total: ${output.length} chars]`;
          }

          if (code !== 0) {
            reject(
              new Error(
                `Command exited with code ${code}. This usually indicates an error.\n\n${
                  output || '(no output)'
                }`,
              ),
            );
          } else {
            const result = output.trim() || 'Done. Command completed successfully with no output.';
            const lines = result.split('\n').length;
            resolve({result: result, displayText: `Command executed (${lines} lines of output)`});
          }
        });
      });
    },
  );
}
