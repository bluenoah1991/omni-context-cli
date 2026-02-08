import { ToolDefinition, ToolExecutionResult, ToolHandler } from '../types/tool';

interface RegisteredTool {
  definition: ToolDefinition;
  handler: ToolHandler;
}

const registeredTools = new Map<string, RegisteredTool>();

export function registerTool(
  definition: ToolDefinition,
  handler: (args: any) => Promise<any>,
): void {
  const wrappedHandler: ToolHandler = async (args: any) => {
    try {
      const result = await handler(args);
      if (result && typeof result === 'object' && 'success' in result) {
        return result;
      }
      return {success: true, result};
    } catch (error) {
      return {success: false, error: (error as any)?.message || String(error)};
    }
  };
  registeredTools.set(definition.name, {definition, handler: wrappedHandler});
}

export async function executeTool(toolName: string, args: any): Promise<ToolExecutionResult> {
  const tool = registeredTools.get(toolName);
  if (!tool) {
    return {success: false, error: `Tool not found: ${toolName}`};
  }
  return tool.handler(args);
}

export function getToolDefinitions(): ToolDefinition[] {
  return [...registeredTools.values()].map(t => t.definition);
}
