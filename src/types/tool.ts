import { StreamCallbacks } from './streamCallbacks';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {properties: Record<string, unknown>; required?: string[];};
  formatCall?: (args: Record<string, unknown>) => string;
  builtin?: boolean;
}

export interface FileDiff {
  filePath: string;
  patch: string;
}

export interface ToolHandlerResult {
  result: any;
  displayText: string;
  dataUrl?: string;
  diffs?: FileDiff[];
}

export type ToolHandler = (
  args: any,
  signal?: AbortSignal,
  callbacks?: StreamCallbacks,
) => Promise<ToolHandlerResult>;

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  displayText?: string;
  dataUrl?: string;
  diffs?: FileDiff[];
}

export interface PendingToolCall {
  content: string;
  timestamp: number;
  toolName: string;
}

export interface ToolFilter {
  excludeAgents?: boolean;
  excludeMcp?: boolean;
  allowedTools?: string[] | null;
  additionalTools?: string[] | null;
}
