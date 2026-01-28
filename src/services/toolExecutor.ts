import { ToolDefinition, ToolExecutionResult, ToolFilter, ToolHandler } from '../types/tool';
import { getAgentModel, loadAppConfig } from './configManager';
import { executeMCPTool, getAllMCPToolDefinitions, isMCPTool } from './mcpManager';

const tools: Map<string, {definition: ToolDefinition; handler: ToolHandler;}> = new Map();

export async function getTools(toolFilter?: ToolFilter): Promise<ToolDefinition[]> {
  const localTools = Array.from(tools.values()).map(t => t.definition);
  const mcpTools = getAllMCPToolDefinitions();
  let allTools = [...localTools, ...mcpTools];

  const agentModel = getAgentModel(loadAppConfig());
  if (agentModel?.provider !== 'anthropic') {
    allTools = allTools.filter(t => t.name !== 'WebSearch');
  }

  if (!toolFilter) return allTools;

  const additionalSet = new Set(toolFilter.additionalTools || []);

  if (toolFilter.excludeAgents) {
    allTools = allTools.filter(t =>
      !t.name.startsWith('agent_') || !t.builtin || additionalSet.has(t.name)
    );
  }

  if (toolFilter.excludeMcp) {
    allTools = allTools.filter(t => !t.name.startsWith('mcp_') || additionalSet.has(t.name));
  }

  if (toolFilter.allowedTools) {
    allTools = allTools.filter(t =>
      t.name.startsWith('agent_') || t.name.startsWith('mcp_')
      || toolFilter.allowedTools!.includes(t.name)
      || additionalSet.has(t.name)
    );
  }

  return allTools;
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
  if (isMCPTool(toolName)) {
    try {
      const result = await executeMCPTool(toolName, args);
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
    return {
      success: true,
      result: result.result,
      displayText: result.displayText,
      dataUrl: result.dataUrl,
      diffs: result.diffs,
    };
  } catch (error) {
    return {success: false, error: String(error)};
  }
}
