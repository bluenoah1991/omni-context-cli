import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { normalizePath } from '../../utils/wsl';
import { registerTool } from '../toolExecutor';
import { getGrepExcludes } from './ignorePatterns';

const MAX_LINE_LENGTH = 1000;
const MAX_OUTPUT_LENGTH = 30000;

function getRipgrepPath(): string {
  const platform = process.platform;

  let binDir: string;
  if (platform === 'win32') {
    binDir = 'x86_64-pc-windows-msvc';
  } else if (platform === 'darwin') {
    binDir = 'aarch64-apple-darwin';
  } else {
    binDir = 'x86_64-unknown-linux-musl';
  }

  const exeName = platform === 'win32' ? 'rg.exe' : 'rg';
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const binPath = path.join(scriptDir, 'bin', binDir, exeName);

  if (fs.existsSync(binPath)) {
    return binPath;
  }

  return 'rg';
}

function countMatches(output: string, mode: string): number {
  if (!output) return 0;

  const lines = output.split('\n').filter(line => line.trim());

  if (mode === 'files_with_matches') {
    return lines.length;
  }

  if (mode === 'count') {
    return lines.reduce((sum, line) => {
      const colonPos = line.lastIndexOf(':');
      if (colonPos > 0) {
        const count = parseInt(line.substring(colonPos + 1), 10);
        return sum + (isNaN(count) ? 0 : count);
      }
      return sum;
    }, 0);
  }

  return lines.filter(line => {
    const colonPos = line.indexOf(':');
    const dashPos = line.indexOf('-');
    return colonPos > 0 && (dashPos === -1 || colonPos < dashPos);
  }).length;
}

export function registerGrepTool(): void {
  registerTool(
    {
      name: 'grep',
      builtin: true,
      description:
        `Search for text patterns using regex. Great for finding function definitions, tracking variable usage, hunting down specific patterns, or doing code audits. Returns matches with file paths and line numbers. Respects .gitignore and searches hidden files. Output shows match counts and can be filtered by type, path, or glob pattern.`,
      formatCall: (args: Record<string, unknown>) => String(args.pattern || ''),
      parameters: {
        properties: {
          pattern: {type: 'string', description: 'Regex pattern. Case-sensitive by default.'},
          path: {
            type: 'string',
            description: 'Directory or file to search. Default: current directory.',
          },
          glob: {type: 'string', description: 'File glob pattern, like "*.ts" or "*.{js,jsx}"'},
          outputMode: {
            type: 'string',
            description:
              'Output format: "content" (default, show matches), "files_with_matches" (paths only), or "count" (match counts)',
          },
          ignoreCase: {type: 'boolean', description: 'Enable case-insensitive matching?'},
          linesContext: {type: 'number', description: 'Context lines before and after matches.'},
          linesBefore: {type: 'number', description: 'Context lines before matches.'},
          linesAfter: {type: 'number', description: 'Context lines after matches.'},
          showLineNumbers: {type: 'boolean', description: 'Show line numbers? Default: true.'},
          maxDepth: {type: 'number', description: 'Max directory depth.'},
          multiline: {type: 'boolean', description: 'Enable multiline matching?'},
          fileType: {type: 'string', description: 'File type filter, like "ts", "py", or "js"'},
        },
        required: ['pattern'],
      },
    },
    async (
      args: {
        pattern: string;
        path?: string;
        glob?: string;
        outputMode?: string;
        ignoreCase?: boolean;
        linesContext?: number;
        linesBefore?: number;
        linesAfter?: number;
        showLineNumbers?: boolean;
        maxDepth?: number;
        multiline?: boolean;
        fileType?: string;
      },
      signal?: AbortSignal,
    ) => {
      const {
        pattern,
        path: searchPath,
        glob,
        outputMode = 'content',
        ignoreCase,
        linesContext,
        linesBefore,
        linesAfter,
        showLineNumbers = true,
        maxDepth,
        multiline,
        fileType,
      } = args;

      if (!pattern) {
        throw new Error('You need to provide a pattern to search for');
      }

      const targetPath = searchPath ? path.resolve(await normalizePath(searchPath)) : process.cwd();

      const rgPath = getRipgrepPath();

      const rgArgs: string[] = [
        '--color=never',
        '--max-columns',
        String(MAX_LINE_LENGTH),
        '--max-columns-preview',
        '--hidden',
      ];

      if (outputMode === 'files_with_matches') {
        rgArgs.push('--files-with-matches');
      } else if (outputMode === 'count') {
        rgArgs.push('--count');
      } else {
        if (showLineNumbers) {
          rgArgs.push('--line-number');
        } else {
          rgArgs.push('--no-line-number');
        }
        rgArgs.push('--no-heading', '--with-filename');
      }

      if (ignoreCase) {
        rgArgs.push('--ignore-case');
      }

      if (linesContext && linesContext > 0) {
        rgArgs.push('--context', String(Math.min(linesContext, 10)));
      } else {
        if (linesBefore && linesBefore > 0) {
          rgArgs.push('--before-context', String(Math.min(linesBefore, 10)));
        }
        if (linesAfter && linesAfter > 0) {
          rgArgs.push('--after-context', String(Math.min(linesAfter, 10)));
        }
      }

      if (maxDepth && maxDepth > 0) {
        rgArgs.push('--max-depth', String(maxDepth));
      }

      if (multiline) {
        rgArgs.push('--multiline');
      }

      if (fileType) {
        rgArgs.push('--type', fileType);
      }

      for (const ignorePattern of getGrepExcludes()) {
        rgArgs.push('--glob', `!${ignorePattern}`);
      }

      if (glob) {
        rgArgs.push('--glob', glob);
      }

      rgArgs.push('--', pattern, targetPath);

      return new Promise((resolve, reject) => {
        const child = spawn(rgPath, rgArgs, {
          cwd: process.cwd(),
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        });

        let stdout = '';
        let stderr = '';
        let stdoutBytes = 0;
        let truncated = false;

        const onAbort = () => {
          child.kill('SIGTERM');
          reject(new Error('Search aborted'));
        };

        if (signal) {
          if (signal.aborted) {
            child.kill('SIGTERM');
            reject(new Error('Search aborted'));
            return;
          }
          signal.addEventListener('abort', onAbort, {once: true});
        }

        child.stdout.on('data', (data: Buffer) => {
          if (truncated) return;

          const chunk = data.toString();
          if (stdoutBytes + chunk.length > MAX_OUTPUT_LENGTH) {
            const remaining = MAX_OUTPUT_LENGTH - stdoutBytes;
            stdout += chunk.slice(0, remaining);
            stdoutBytes = MAX_OUTPUT_LENGTH;
            truncated = true;
            child.kill('SIGTERM');
          } else {
            stdout += chunk;
            stdoutBytes += chunk.length;
          }
        });

        child.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        child.on('close', code => {
          if (signal) {
            signal.removeEventListener('abort', onAbort);
          }

          if (code === 0 || code === null) {
            let result = stdout.trim();
            if (truncated) {
              const lastNewline = result.lastIndexOf('\n');
              if (lastNewline > 0) {
                result = result.slice(0, lastNewline);
              }
              result += '\n\n[Output truncated. Be more specific with your pattern or path.]';
            }

            const matchCount = result ? countMatches(result, outputMode) : 0;

            if (!result) {
              resolve({result: `No matches for "${pattern}".`, displayText: 'No matches'});
            } else {
              resolve({
                result: result,
                displayText: matchCount > 0 ? `Found ${matchCount} matches` : 'No matches',
              });
            }
          } else if (code === 1) {
            resolve({result: `No matches for "${pattern}".`, displayText: 'No matches'});
          } else if (code === 2) {
            const errorMsg = stderr.trim() || 'Search error';
            reject(new Error(errorMsg));
          } else {
            resolve({result: `No matches for "${pattern}".`, displayText: 'No matches'});
          }
        });

        child.on('error', err => {
          if (signal) {
            signal.removeEventListener('abort', onAbort);
          }
          reject(err);
        });
      });
    },
  );
}
