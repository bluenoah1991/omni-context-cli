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

export function registerMultiEditTool(): void {
  registerTool(
    {
      name: 'multiedit',
      description:
        `This is a tool for making multiple edits to a single file in one operation. It allows you to perform multiple find-and-replace operations efficiently. Prefer this tool over the Edit tool when you need to make multiple edits to the same file.

Before using this tool:
1. Use the Read tool to understand the file's contents and context
2. Verify the directory path is correct

To make multiple file edits, provide:
1. filePath: The absolute path to the file to modify (must be absolute, not relative)
2. edits: An array of edit operations to perform, where each edit contains:
   - oldString: The text to replace (must match the file contents exactly, including all whitespace and indentation)
   - newString: The edited text to replace the oldString
   - replaceAll: Replace all occurrences of oldString (optional, defaults to false)

IMPORTANT:
- All edits are applied in sequence, in the order they are provided
- Each edit operates on the result of the previous edit
- All edits must be valid for the operation to succeed - if any edit fails, none will be applied
- This tool is ideal when you need to make several changes to different parts of the same file

CRITICAL REQUIREMENTS:
1. All edits follow the same requirements as the single Edit tool
2. The edits are atomic - either all succeed or none are applied
3. Plan your edits carefully to avoid conflicts between sequential operations

WARNING:
- The tool will fail if edits.oldString doesn't match the file contents exactly (including whitespace)
- The tool will fail if edits.oldString and edits.newString are the same
- Since edits are applied in sequence, ensure that earlier edits don't affect the text that later edits are trying to find
- File path must be absolute`,
      parameters: {
        properties: {
          filePath: {type: 'string', description: 'The absolute path to the file to modify'},
          edits: {
            type: 'array',
            description: 'Array of edit operations to perform sequentially on the file',
            items: {
              type: 'object',
              properties: {
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
              required: ['oldString', 'newString'],
            },
          },
        },
        required: ['filePath', 'edits'],
      },
    },
    async (
      args: {
        filePath: string;
        edits: Array<{oldString: string; newString: string; replaceAll?: boolean;}>;
      },
    ) => {
      const {filePath, edits} = args;

      if (!filePath) {
        throw new Error('filePath is required');
      }
      if (!edits || edits.length === 0) {
        throw new Error('edits array is required and must not be empty');
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

      let currentContent = content;
      for (let i = 0; i < edits.length; i++) {
        const edit = edits[i];
        if (edit.oldString === edit.newString) {
          throw new Error(`Edit ${i + 1}: oldString and newString must be different`);
        }
        try {
          currentContent = replace(currentContent, edit.oldString, edit.newString, edit.replaceAll);
        } catch (error: any) {
          throw new Error(`Edit ${i + 1} failed: ${error.message}`);
        }
      }

      await fs.writeFile(absolutePath, currentContent, 'utf-8');

      return {
        content: `Successfully applied ${edits.length} edits to ${path.basename(absolutePath)}`,
      };
    },
  );
}
