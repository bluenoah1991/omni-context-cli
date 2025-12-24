export interface AgentDefinition {
  name: string;
  description: string;
  promptTemplate: string;
  allowedTools?: string[];
  parameters: {properties: Record<string, unknown>; required?: string[];};
}
