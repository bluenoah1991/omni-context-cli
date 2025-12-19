import { spawn } from 'child_process';
import * as path from 'path';
import { registerTool } from '../toolExecutor';

const MAX_OUTPUT_LENGTH = 30000;
const DEFAULT_TIMEOUT = 120000;

export function registerBashTool(): void {
  registerTool({
    name: 'bash',
    description:
      `Run shell commands in the system terminal. Use this for: running build scripts, installing dependencies, executing CLI tools, or any system-level operations. On Windows, commands run in PowerShell; on Unix systems, they run in bash. The output is captured and returned. Long-running commands will be terminated after the timeout.`,
    parameters: {
      properties: {
        command: {
          type: 'string',
          description:
            'The shell command to execute. Can include pipes, redirects, and chained commands. Examples: "npm install", "git status", "ls -la | grep .ts"',
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
      },
      required: ['command'],
    },
  }, async (args: {command: string; timeout?: number; workdir?: string;}) => {
    const {command, timeout = DEFAULT_TIMEOUT, workdir} = args;

    if (!command) {
      throw new Error(
        'Missing required parameter: command. Please provide a shell command to execute.',
      );
    }
    if (timeout !== undefined && timeout < 0) {
      throw new Error(
        `Invalid timeout: ${timeout}ms. Timeout must be a positive number (e.g., 60000 for 1 minute).`,
      );
    }

    const cwd = workdir ? path.resolve(process.cwd(), workdir) : process.cwd();

    const shell = process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';
    const shellArgs = process.platform === 'win32' ? ['-Command', command] : ['-c', command];

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
          resolve({
            content: output.trim() || 'Done. Command completed successfully with no output.',
          });
        }
      });
    });
  });
}
