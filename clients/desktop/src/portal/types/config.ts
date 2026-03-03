import type { ModelConfig } from '../../../../../src/types/config';

export type WebTheme = 'dark' | 'light' | 'auto';

export interface OmxConfig {
  models: ModelConfig[];
  defaultModelId?: string;
  webTheme?: WebTheme;
  [key: string]: unknown;
}

export type ApprovalMode = 'none' | 'write' | 'all';

export type Tab =
  | 'workspaces'
  | 'models'
  | 'mcp'
  | 'settings'
  | 'prompts'
  | 'office'
  | 'browser'
  | 'obsidian'
  | 'figma'
  | 'mobile';

export interface MCPServerConfig {
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

export interface DesktopConfig {
  workspaces: Array<{name: string; path: string;}>;
  defaultWorkspace: string;
  lastWorkspace?: string;
  approvalMode?: ApprovalMode;
  lanAccess?: boolean;
  fixedPort?: number | null;
  language?: string;
}
