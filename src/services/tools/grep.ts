import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { registerTool } from '../toolExecutor';
import { getGrepExcludes } from './ignorePatterns';

const MAX_LINE_LENGTH = 1000;
const MAX_OUTPUT_BYTES = 16 * 1024;

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
      description:
        `Search for text patterns in files using regex. Returns matching lines with file paths and line numbers. Respects .gitignore. Searches hidden files by default.`,
      formatCall: (args: Record<string, unknown>) => String(args.pattern || ''),
      parameters: {
        properties: {
          pattern: {
            type: 'string',
            description: 'Regex pattern to search for. Case-sensitive by default.',
          },
          path: {
            type: 'string',
            description: 'Directory or file to search in. Defaults to current working directory.',
          },
          glob: {
            type: 'string',
            description: 'Glob pattern for files to include. Examples: "*.ts", "*.{js,jsx}"',
          },
          outputMode: {
            type: 'string',
            description:
              'Output mode: "content" (default, show matches), "files_with_matches" (file paths only), "count" (match counts).',
          },
          ignoreCase: {type: 'boolean', description: 'Case-insensitive search.'},
          linesContext: {
            type: 'number',
            description: 'Number of context lines before and after each match.',
          },
          linesBefore: {type: 'number', description: 'Number of context lines before each match.'},
          linesAfter: {type: 'number', description: 'Number of context lines after each match.'},
          showLineNumbers: {type: 'boolean', description: 'Show line numbers. Default is true.'},
          maxDepth: {type: 'number', description: 'Maximum directory depth to search.'},
          multiline: {type: 'boolean', description: 'Enable multiline matching.'},
          fileType: {
            type: 'string',
            description: 'File type to search. Examples: "ts", "py", "js"',
          },
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
        throw new Error('Missing required parameter: pattern');
      }

      const rootDir = process.cwd();
      const targetPath = searchPath
        ? path.isAbsolute(searchPath) ? searchPath : path.resolve(rootDir, searchPath)
        : rootDir;

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
          cwd: rootDir,
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
          if (stdoutBytes + chunk.length > MAX_OUTPUT_BYTES) {
            const remaining = MAX_OUTPUT_BYTES - stdoutBytes;
            stdout += chunk.slice(0, remaining);
            stdoutBytes = MAX_OUTPUT_BYTES;
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
              result += '\n\n[Output truncated. Use more specific pattern or path.]';
            }

            const matchCount = result ? countMatches(result, outputMode) : 0;

            if (!result) {
              resolve({
                result: `No matches found for "${pattern}".`,
                displayText: 'No matches found',
              });
            } else {
              resolve({
                result: result,
                displayText: matchCount > 0 ? `Found ${matchCount} matches` : 'No matches found',
              });
            }
          } else if (code === 1) {
            resolve({
              result: `No matches found for "${pattern}".`,
              displayText: 'No matches found',
            });
          } else if (code === 2) {
            const errorMsg = stderr.trim() || 'Search error';
            reject(new Error(errorMsg));
          } else {
            resolve({
              result: `No matches found for "${pattern}".`,
              displayText: 'No matches found',
            });
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
