import { ToolDefinition, ToolExecutionResult, ToolHandler } from '../types/tool';
import { mcpManager } from './mcpManager';

const tools: Map<string, {definition: ToolDefinition; handler: ToolHandler;}> = new Map();

export async function getTools(): Promise<ToolDefinition[]> {
  const localTools = Array.from(tools.values()).map(t => t.definition);
  const mcpTools = mcpManager.getAllToolDefinitions();
  return [...localTools, ...mcpTools];
}

export function registerTool(definition: ToolDefinition, handler: ToolHandler): void {
  tools.set(definition.name, {definition, handler});
}

export function clearTools(): void {
  tools.clear();
}

export function formatToolCall(toolName: string, args: any): string {
  const tool = tools.get(toolName);
  if (tool?.definition.formatCall) {
    return tool.definition.formatCall(args);
  }
  return Object.values(args).map(v => String(v)).join(' ');
}

export async function executeTool(
  toolName: string,
  args: any,
  signal?: AbortSignal,
): Promise<ToolExecutionResult> {
  if (mcpManager.isMCPTool(toolName)) {
    try {
      const result = await mcpManager.executeTool(toolName, args);
      return {success: true, result};
    } catch (error) {
      return {success: false, error: String(error)};
    }
  }

  const tool = tools.get(toolName);

  if (!tool) {
    return {success: false, error: `Tool not found: ${toolName}`};
  }

  try {
    const result = await tool.handler(args, signal);
    return {success: true, result: result.result, displayText: result.displayText};
  } catch (error) {
    return {success: false, error: String(error)};
  }
}
