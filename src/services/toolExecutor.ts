import { ToolDefinition, ToolExecutionResult, ToolHandler } from '../types/tool';

const tools: Map<string, {definition: ToolDefinition; handler: ToolHandler;}> = new Map();

export async function getTools(): Promise<ToolDefinition[]> {
  return Array.from(tools.values()).map(t => t.definition);
}

export function registerTool(definition: ToolDefinition, handler: ToolHandler): void {
  tools.set(definition.name, {definition, handler});
}

export function clearTools(): void {
  tools.clear();
}

export async function executeTool(toolName: string, args: any): Promise<ToolExecutionResult> {
  const tool = tools.get(toolName);

  if (!tool) {
    return {success: false, error: `Tool not found: ${toolName}`};
  }

  try {
    const result = await tool.handler(args);
    return {success: true, result};
  } catch (error) {
    return {success: false, error: String(error)};
  }
}
