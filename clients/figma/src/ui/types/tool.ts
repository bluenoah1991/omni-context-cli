export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {properties: Record<string, unknown>; required?: string[];};
}

export interface ToolExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<ToolExecutionResult>;
