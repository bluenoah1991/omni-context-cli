export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {properties: Record<string, unknown>; required?: string[];};
}

export type ToolHandler = (args: any, signal?: AbortSignal) => Promise<any>;

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
}

export interface PendingToolCall {
  content: string;
  timestamp: number;
  toolName: string;
}
