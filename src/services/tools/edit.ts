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
      `oldString not found in content. The search string must EXACTLY match, including all whitespace and indentation.`,
    );
  }

  const occurrences = normalizedContent.split(normalizedOld).length - 1;

  if (occurrences > 1 && !replaceAll) {
    throw new Error(
      `oldString found ${occurrences} times in the file and requires more code context to uniquely identify the intended match. Either provide a larger string with more surrounding context to make it unique or use replaceAll to change every instance of oldString.`,
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
      description: `Performs exact string replacements in files.

Usage:
- You must use your Read tool at least once in the conversation before editing
- When editing text from Read tool output, preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix
- The line number prefix format is: spaces + line number + tab. Everything after that tab is the actual file content to match
- Never include any part of the line number prefix in the oldString or newString
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required
- The edit will FAIL if oldString is not found in the file with an error "oldString not found in content"
- The edit will FAIL if oldString is found multiple times in the file with an error about requiring more code context
- Either provide a larger string with more surrounding context to make it unique or use replaceAll to change every instance
- Use replaceAll for replacing and renaming strings across the file (useful for renaming variables)`,
      parameters: {
        properties: {
          filePath: {type: 'string', description: 'The absolute path to the file to modify'},
          oldString: {type: 'string', description: 'The text to replace'},
          newString: {
            type: 'string',
            description: 'The text to replace it with (must be different from oldString)',
          },
          replaceAll: {
            type: 'boolean',
            description: 'Replace all occurrences of oldString (default false)',
          },
        },
        required: ['filePath', 'oldString', 'newString'],
      },
    },
    async (
      args: {filePath: string; oldString: string; newString: string; replaceAll?: boolean;},
    ) => {
      const {filePath, oldString, newString, replaceAll} = args;

      if (!filePath) {
        throw new Error('filePath is required');
      }
      if (oldString === newString) {
        throw new Error('oldString and newString must be different');
      }

      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);

      let content: string;
      try {
        const stats = await fs.stat(absolutePath);
        if (stats.isDirectory()) {
          throw new Error(`Path is a directory, not a file: ${absolutePath}`);
        }
        content = await fs.readFile(absolutePath, 'utf-8');
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          throw new Error(`File not found: ${absolutePath}`);
        }
        throw error;
      }

      const newContent = replace(content, oldString, newString, replaceAll);
      await fs.writeFile(absolutePath, newContent, 'utf-8');

      return {content: 'Edit applied successfully'};
    },
  );
}
