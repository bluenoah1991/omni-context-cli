import { exec } from 'child_process';
import { promisify } from 'util';
import { registerTool } from '../toolExecutor';

const execAsync = promisify(exec);

export function registerBashTool(): void {
  registerTool({
    name: 'shell',
    description: `
      Runs a shell command in the cwd. This tool uses /bin/sh. Do NOT use bash-isms; they won't work.
      Only use POSIX-compliant shell.

      The shell command is run as a subshell, not connected to a PTY, so don't run interactive commands:
      only run commands that will work headless.

      Do NOT attempt to pipe echo, printf, etc commands to work around this. If it's interactive, either
      figure out a non-interactive variant to run instead, or if that's impossible, as a last resort you
      can ask the user to run the command, explaining that it's interactive.

      Often interactive commands provide flags to run them non-interactively. Prefer those flags.
    `,
    parameters: {
      properties: {
        cmd: {type: 'string', description: 'The command to run'},
        timeout: {
          type: 'number',
          description:
            'A timeout for the command, in milliseconds. Be generous. You MUST specify this.',
        },
      },
      required: ['cmd', 'timeout'],
    },
  }, async (args: {cmd: string; timeout: number;}) => {
    const {cmd, timeout} = args;

    if (!cmd) {
      throw new Error('cmd is required');
    }
    if (!timeout) {
      throw new Error('timeout is required');
    }

    try {
      const {stdout, stderr} = await execAsync(cmd, {
        cwd: process.cwd(),
        timeout,
        maxBuffer: 10 * 1024 * 1024,
      });

      const output = stdout + (stderr ? `\nSTDERR:\n${stderr}` : '');
      return {content: output.trim()};
    } catch (error: any) {
      if (error.killed) {
        throw new Error(`Command timed out after ${timeout}ms`);
      }
      const output = (error.stdout || '') + (error.stderr ? `\nSTDERR:\n${error.stderr}` : '');
      throw new Error(`Command failed with exit code ${error.code}:\n${output || error.message}`);
    }
  });
}
