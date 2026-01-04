import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import fs from 'node:fs';
import { MCPConfig, MCPServerConfig } from '../types/mcp';
import { ToolDefinition } from '../types/tool';
import { getOmxFilePath } from '../utils/omxPaths';
import { ideIntegration } from './ideIntegration.js';

const MCP_CONFIG_FILE = getOmxFilePath('mcp.json');

class MCPManager {
  private clients: Map<string, Client> = new Map();
  private tools: Map<string, Tool> = new Map();
  private configs: Map<string, MCPServerConfig> = new Map();

  async initialize(): Promise<void> {
    await ideIntegration.initialize();

    const config = this.loadConfig();
    if (!config) return;
    for (const [id, serverConfig] of Object.entries(config.mcpServers)) {
      this.configs.set(id, serverConfig);
      await this.connectServer(id, serverConfig);
    }
  }

  private loadConfig(): MCPConfig | null {
    if (!fs.existsSync(MCP_CONFIG_FILE)) return null;
    const content = fs.readFileSync(MCP_CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  }

  getAllToolDefinitions(): ToolDefinition[] {
    const tools: ToolDefinition[] = [];
    for (const [key, tool] of this.tools) {
      tools.push({
        name: `mcp_${key}`,
        description: tool.description || '',
        parameters: {
          properties: (tool.inputSchema as any).properties || {},
          required: (tool.inputSchema as any).required,
        },
      });
    }
    for (const ideTool of ideIntegration.getToolDefinitions()) {
      tools.push({
        name: ideTool.name,
        description: ideTool.description,
        parameters: ideTool.parameters,
      });
    }
    return tools;
  }

  async executeTool(toolName: string, args: any): Promise<any> {
    if (ideIntegration.isMCPTool(toolName)) {
      return ideIntegration.executeTool(toolName, args);
    }
    const parts = toolName.split('_');
    if (parts.length < 3 || parts[0] !== 'mcp') {
      throw new Error('Invalid MCP tool name format');
    }
    const serverId = parts[1];
    const originalToolName = parts.slice(2).join('_');
    return this.callToolWithRetry(serverId, originalToolName, args);
  }

  private async callToolWithRetry(
    serverId: string,
    toolName: string,
    args: any,
    retry = 1,
  ): Promise<any> {
    let client = this.clients.get(serverId);
    if (!client) {
      const config = this.configs.get(serverId);
      if (!config) throw new Error(`MCP server config not found: ${serverId}`);
      await this.connectServer(serverId, config);
      client = this.clients.get(serverId);
      if (!client) throw new Error(`Failed to connect to MCP server: ${serverId}`);
    }
    try {
      return await client.callTool({name: toolName, arguments: args || {}});
    } catch (error) {
      if (retry <= 0) throw error;
      this.clients.delete(serverId);
      return this.callToolWithRetry(serverId, toolName, args, retry - 1);
    }
  }

  isMCPTool(toolName: string): boolean {
    return toolName.startsWith('mcp_');
  }

  async shutdown(): Promise<void> {
    await ideIntegration.shutdown();
    for (const client of this.clients.values()) {
      try {
        await client.close();
      } catch {}
    }
    this.clients.clear();
  }

  private async connectServer(id: string, config: MCPServerConfig): Promise<void> {
    try {
      const client = new Client({name: 'omx', version: '1.0.0'}, {capabilities: {}});
      if (config.url) {
        const headers: Record<string, string> = {};
        if (config.key) {
          headers['Authorization'] = `Bearer ${config.key}`;
        }
        const transport = new StreamableHTTPClientTransport(new URL(config.url), {
          requestInit: {headers},
        });
        await client.connect(transport);
      } else if (config.command) {
        const transport = new StdioClientTransport({
          command: config.command,
          args: config.args || [],
          env: {...process.env, ...config.env} as Record<string, string>,
          stderr: 'ignore',
        });
        await client.connect(transport);
      } else {
        return;
      }
      this.clients.set(id, client);
      await this.loadServerTools(id, client);
    } catch {}
  }

  private async loadServerTools(serverId: string, client: Client): Promise<void> {
    try {
      const response = await client.listTools();
      const tools = response.tools || [];
      for (const tool of tools) {
        this.tools.set(`${serverId}_${tool.name}`, tool);
      }
    } catch {}
  }
}

export const mcpManager = new MCPManager();
