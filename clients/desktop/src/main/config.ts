import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { DesktopConfig, MCPConfig, OmxConfig } from '../portal/types/config';
import { getDefaultWorkspace, getOmxDir } from './paths';

export function loadOmxConfig(): OmxConfig {
  const configPath = join(getOmxDir(), 'omx.json');
  try {
    if (existsSync(configPath)) {
      return JSON.parse(readFileSync(configPath, 'utf-8'));
    }
  } catch {}
  return {models: []};
}

export function saveOmxConfig(config: OmxConfig): void {
  const dir = getOmxDir();
  if (!existsSync(dir)) mkdirSync(dir, {recursive: true});
  writeFileSync(join(dir, 'omx.json'), JSON.stringify(config, null, 2));
}

export function loadDesktopConfig(): DesktopConfig {
  const defaultWorkspace = getDefaultWorkspace();
  const configPath = join(getOmxDir(), 'desktop.json');
  try {
    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      return {...config, defaultWorkspace};
    }
  } catch {}
  return {
    workspaces: [{name: 'Default Workspace', path: defaultWorkspace}],
    defaultWorkspace,
    lastWorkspace: defaultWorkspace,
  };
}

export function saveDesktopConfig(config: DesktopConfig): void {
  const dir = getOmxDir();
  if (!existsSync(dir)) mkdirSync(dir, {recursive: true});
  const {defaultWorkspace, ...rest} = config;
  writeFileSync(join(dir, 'desktop.json'), JSON.stringify(rest, null, 2));
}

export function loadMcpConfig(): MCPConfig {
  const configPath = join(getOmxDir(), 'mcp.json');
  try {
    if (existsSync(configPath)) {
      const parsed = JSON.parse(readFileSync(configPath, 'utf-8'));
      return {mcpServers: parsed?.mcpServers ?? {}};
    }
  } catch {}
  return {mcpServers: {}};
}

export function saveMcpConfig(config: MCPConfig): void {
  const dir = getOmxDir();
  if (!existsSync(dir)) mkdirSync(dir, {recursive: true});
  writeFileSync(join(dir, 'mcp.json'), JSON.stringify(config, null, 2));
}
