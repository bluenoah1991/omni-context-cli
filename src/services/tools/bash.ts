import { spawn } from 'child_process';
import * as path from 'path';
import { registerTool } from '../toolExecutor';

const MAX_OUTPUT_LENGTH = 30000;
const DEFAULT_TIMEOUT = 120000;

export function registerBashTool(): void {
  registerTool({
    name: 'bash',
    description: `
Executes a given bash command in a persistent shell session with optional timeout.

All commands run in the current working directory by default. Use the workdir parameter if you need to run a command in a different directory.

Before executing the command:
1. Directory Verification: If the command will create new directories or files, verify the parent directory exists
2. Command Execution: Always quote file paths that contain spaces with double quotes

Usage notes:
- The command argument is required
- Optional timeout in milliseconds (up to 600000ms / 10 minutes), default is 120000ms (2 minutes)
- The description argument is required: write a clear, concise description of what this command does in 5-10 words
- If output exceeds 30000 characters, it will be truncated
- Avoid using Bash with find, grep, cat, head, tail, sed, awk, or echo commands unless truly necessary. Use dedicated tools instead:
  * File search: Use glob (NOT find or ls)
  * Content search: Use grep (NOT grep/rg in bash)
  * Read files: Use read (NOT cat/head/tail)
  * Edit files: Use edit (NOT sed/awk)
  * Write files: Use write (NOT echo >/cat <<EOF)
- When issuing multiple commands:
  * If commands are independent: make multiple bash tool calls in parallel
  * If commands depend on each other: use && to chain them (e.g., git add . && git commit -m "message" && git push)
  * Use ; only when you need sequential commands but don't care if earlier ones fail
  * DO NOT use newlines to separate commands
- Try to maintain current working directory by using absolute paths and avoiding cd
- Prefer workdir parameter over cd commands

Working Directory:
The workdir parameter sets the working directory for command execution. Prefer using workdir over "cd <dir> &&" command chains.

Example: workdir="path/to/dir", command="pytest tests" is better than command="cd path/to/dir && pytest tests"
    `,
    parameters: {
      properties: {
        command: {type: 'string', description: 'The command to execute'},
        timeout: {type: 'number', description: 'Optional timeout in milliseconds'},
        workdir: {
          type: 'string',
          description:
            'The working directory to run the command in. Defaults to current directory.',
        },
        description: {
          type: 'string',
          description:
            'Clear, concise description of what this command does in 5-10 words. Examples: "Lists files in current directory" for ls, "Shows working tree status" for git status',
        },
      },
      required: ['command', 'description'],
    },
  }, async (args: {command: string; timeout?: number; workdir?: string; description: string;}) => {
    const {command, timeout = DEFAULT_TIMEOUT, workdir, description} = args;

    if (!command) {
      throw new Error('command is required');
    }
    if (!description) {
      throw new Error('description is required');
    }
    if (timeout !== undefined && timeout < 0) {
      throw new Error(`Invalid timeout value: ${timeout}. Timeout must be a positive number.`);
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
        reject(new Error(`Command timed out after ${timeout}ms`));
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
          reject(new Error(`Failed to execute command: ${error.message}`));
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
            + `\n\n[Output truncated. Total length: ${output.length} characters]`;
        }

        if (code !== 0) {
          reject(new Error(`Command failed with exit code ${code}:\n${output || 'No output'}`));
        } else {
          resolve({content: output.trim() || 'Command executed successfully'});
        }
      });
    });
  });
}
