export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {properties: Record<string, unknown>; required?: string[];};
}

export type ToolHandler = (args: any) => Promise<any>;

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
}
