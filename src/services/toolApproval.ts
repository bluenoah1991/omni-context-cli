import { ToolCall } from '../types/streamCallbacks';

type ToolApprovalMode = 'none' | 'write' | 'all';

let toolApprovalMode: ToolApprovalMode = 'none';

const WRITE_TOOLS = new Set(['Bash', 'Edit', 'Write']);

export function enableToolApproval(mode: 'write' | 'all'): void {
  toolApprovalMode = mode;
}

export function isToolApprovalEnabled(): boolean {
  return toolApprovalMode !== 'none';
}

export function requiresApproval(toolName: string): boolean {
  if (toolApprovalMode === 'none') return false;
  if (toolName.startsWith('agent_') || toolName.startsWith('mcp_')) return false;
  if (toolApprovalMode === 'all') return true;
  return WRITE_TOOLS.has(toolName);
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '...' : str;
}

export function formatApprovalPrompt(toolCall: ToolCall): string {
  const {name, input} = toolCall;

  switch (name) {
    case 'Bash': {
      const cmd = String(input.command || '');
      return `Run command: ${truncate(cmd, 80)}`;
    }
    case 'BashOutput': {
      return `Check task: ${input.taskId}`;
    }
    case 'Edit': {
      return `Edit file: ${input.filePath}`;
    }
    case 'Write': {
      return input.createOnly ? `Create file: ${input.filePath}` : `Write file: ${input.filePath}`;
    }
    case 'Read': {
      return `Read file: ${input.filePath}`;
    }
    case 'Glob': {
      return `Find files: ${input.pattern}`;
    }
    case 'Grep': {
      return `Search: ${truncate(String(input.pattern || ''), 60)}`;
    }
    case 'WebSearch': {
      return `Web search: ${truncate(String(input.query || ''), 60)}`;
    }
    default: {
      const preview = JSON.stringify(input).slice(0, 60);
      return `${name}: ${truncate(preview, 60)}`;
    }
  }
}
