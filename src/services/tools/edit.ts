import * as fs from 'fs/promises';
import * as path from 'path';
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
      `Text not found in file. The oldString doesn't match any content. Tips:\n  • Check for extra/missing whitespace or line breaks\n  • Read the file first to see the exact content\n  • Make sure you're editing the right file`,
    );
  }

  const occurrences = normalizedContent.split(normalizedOld).length - 1;

  if (occurrences > 1 && !replaceAll) {
    throw new Error(
      `Found ${occurrences} matches for this text. To fix this:\n  • Add more surrounding context to make the match unique, OR\n  • Set replaceAll=true to replace all ${occurrences} occurrences`,
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
      description:
        `Make precise text replacements in a file. Provide the exact text to find (oldString) and what to replace it with (newString). The match must be unique - if the text appears multiple times, include more surrounding context to make it unique, or set replaceAll=true to replace all occurrences. Line endings are normalized automatically.`,
      formatCall: (args: Record<string, unknown>) => String(args.filePath || ''),
      parameters: {
        properties: {
          filePath: {type: 'string', description: 'Path to the file to edit'},
          oldString: {
            type: 'string',
            description:
              'The exact text to find and replace. Must match the file content exactly, including whitespace and indentation. Include enough context (usually 2-3 lines before and after) to make the match unique',
          },
          newString: {
            type: 'string',
            description:
              'The replacement text. Can be empty string to delete the matched text. Preserve proper indentation to maintain code style',
          },
          replaceAll: {
            type: 'boolean',
            description:
              'If true, replace ALL occurrences of oldString. Default is false (single replacement). Use with caution',
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
        throw new Error('Missing required parameter: filePath. Please specify which file to edit.');
      }
      if (oldString === newString) {
        throw new Error(
          'oldString and newString are identical - nothing to change. Make sure you provide different values.',
        );
      }

      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);

      let content: string;
      try {
        const stats = await fs.stat(absolutePath);
        if (stats.isDirectory()) {
          throw new Error(
            `Cannot edit a directory: ${absolutePath}. This path points to a folder, not a file.`,
          );
        }
        content = await fs.readFile(absolutePath, 'utf-8');
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          throw new Error(
            `File not found: ${absolutePath}. Check the path or use 'create' to make a new file.`,
          );
        }
        throw error;
      }

      const newContent = replace(content, oldString, newString, replaceAll);
      await fs.writeFile(absolutePath, newContent, 'utf-8');

      return {
        result: {content: `Edit applied to ${absolutePath}`},
        displayText: 'File edited successfully',
      };
    },
  );
}
