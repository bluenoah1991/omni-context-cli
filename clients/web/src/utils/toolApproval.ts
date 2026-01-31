import type { ToolApprovalRequest } from '../services/chatService';

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '...' : str;
}

export function formatApprovalPrompt(request: ToolApprovalRequest): string {
  const {name, input} = request;

  switch (name) {
    case 'Bash':
      return `Run command: ${truncate(String(input.command || ''), 80)}`;
    case 'BashOutput':
      return `Check task: ${input.taskId}`;
    case 'Edit':
      return `Edit file: ${input.filePath}`;
    case 'Write':
      return input.createOnly ? `Create file: ${input.filePath}` : `Write file: ${input.filePath}`;
    case 'Read':
      return `Read file: ${input.filePath}`;
    case 'Glob':
      return `Find files: ${input.pattern}`;
    case 'Grep':
      return `Search: ${truncate(String(input.pattern || ''), 60)}`;
    case 'WebSearch':
      return `Web search: ${truncate(String(input.query || ''), 60)}`;
    default: {
      const preview = JSON.stringify(input).slice(0, 60);
      return `${name}: ${truncate(preview, 60)}`;
    }
  }
}
