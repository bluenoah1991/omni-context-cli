export interface MCPServerConfig {
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  key?: string;
}

export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}
