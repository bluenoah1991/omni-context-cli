export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {properties: Record<string, unknown>; required?: string[];};
  formatCall?: (args: Record<string, unknown>) => string;
  builtin?: boolean;
}

export interface ToolHandlerResult {
  result: any;
  displayText: string;
  dataUrl?: string;
}

export type ToolHandler = (args: any, signal?: AbortSignal) => Promise<ToolHandlerResult>;

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  displayText?: string;
  dataUrl?: string;
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
