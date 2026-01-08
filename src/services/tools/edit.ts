import * as fs from 'fs/promises';
import * as path from 'path';
import { normalizePath } from '../../utils/wsl';
import { registerTool } from '../toolExecutor';

function normalizeLineEndings(text: string): string {
  return text.replaceAll('\r\n', '\n');
}

function replace(
  content: string,
  oldString: string,
  newString: string,
  replaceAll?: boolean,
): string {
  const normalizedContent = normalizeLineEndings(content);
  const normalizedOld = normalizeLineEndings(oldString);
  const normalizedNew = normalizeLineEndings(newString);

  if (!normalizedContent.includes(normalizedOld)) {
    throw new Error(
      `Couldn't find that text in the file. Tips:\n  • Watch your whitespace and line breaks\n  • Read the file first to see what's actually there\n  • Make sure you have the right file`,
    );
  }

  const occurrences = normalizedContent.split(normalizedOld).length - 1;

  if (occurrences > 1 && !replaceAll) {
    throw new Error(
      `Found ${occurrences} matches. Either:\n  • Add more context to make it unique\n  • Use replaceAll=true to replace all ${occurrences}`,
    );
  }

  if (replaceAll) {
    return normalizedContent.split(normalizedOld).join(normalizedNew);
  }

  return normalizedContent.replace(normalizedOld, normalizedNew);
}

export function registerEditTool(): void {
  registerTool(
    {
      name: 'edit',
      builtin: true,
      description:
        `Make surgical text replacements in files. Great for bug fixes, updating functions, renaming variables, or tweaking specific code sections. Provide the exact text to find (oldString) and what to replace it with (newString). The match must be unique—if it appears multiple times, add more context or use replaceAll=true. Line endings are handled automatically.`,
      formatCall: (args: Record<string, unknown>) => String(args.filePath || ''),
      parameters: {
        properties: {
          filePath: {type: 'string', description: 'File to edit'},
          oldString: {
            type: 'string',
            description:
              'Exact text to find and replace. Match it perfectly—whitespace, indentation, everything. Include 2-3 lines of context to make it unique.',
          },
          newString: {
            type: 'string',
            description:
              'Replacement text. Use an empty string to delete the match. Keep your indentation consistent.',
          },
          replaceAll: {
            type: 'boolean',
            description:
              'Replace all occurrences? Default: false (single replacement). Use this carefully.',
          },
        },
        required: ['filePath', 'oldString', 'newString'],
      },
    },
    async (
      args: {filePath: string; oldString: string; newString: string; replaceAll?: boolean;},
      signal?: AbortSignal,
    ) => {
      const {filePath, oldString, newString, replaceAll} = args;

      if (!filePath) {
        throw new Error('You need to provide a filePath. Which file do you want to edit?');
      }
      if (oldString === newString) {
        throw new Error(
          'oldString and newString are identical. Nothing to change—try different values.',
        );
      }

      const absolutePath = path.resolve(await normalizePath(filePath));

      let content: string;
      try {
        const stats = await fs.stat(absolutePath);
        if (stats.isDirectory()) {
          throw new Error(`Can't edit a directory: ${absolutePath}. That's a folder, not a file`);
        }
        content = await fs.readFile(absolutePath, 'utf-8');
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          throw new Error(
            `File not found: ${absolutePath}. Check the path, or use 'write' to create it.`,
          );
        }
        throw error;
      }

      const newContent = replace(content, oldString, newString, replaceAll);
      await fs.writeFile(absolutePath, newContent, 'utf-8');

      return {result: `Edited ${absolutePath}`, displayText: 'File edited'};
    },
  );
}
