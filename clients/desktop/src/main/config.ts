import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import matter from 'gray-matter';
import { homedir } from 'os';
import { dirname, join } from 'path';
import type { DesktopConfig, MCPConfig, OmxConfig, SkillInfo } from '../portal/types/config';
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

function parseFrontmatter(content: string): {data: any; content: string;} {
  try {
    const result = matter(content);
    return {data: result.data, content: result.content};
  } catch {
    return {data: {}, content};
  }
}

function loadSkillsFromDir(dir: string): SkillInfo[] {
  if (!existsSync(dir)) return [];

  const skills: SkillInfo[] = [];
  const entries = readdirSync(dir, {withFileTypes: true});

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = join(dir, entry.name, 'SKILL.md');
    if (!existsSync(skillFile)) continue;

    const content = readFileSync(skillFile, 'utf-8');
    const {data} = parseFrontmatter(content);
    if (data.name && data.description) {
      skills.push({name: data.name, description: data.description, location: skillFile});
    }
  }

  return skills;
}

export function loadSkills(): SkillInfo[] {
  const omxSkills = loadSkillsFromDir(join(getOmxDir(), 'skills'));
  const claudeSkills = loadSkillsFromDir(join(homedir(), '.claude', 'skills'));

  const seen = new Set<string>();
  const result: SkillInfo[] = [];

  for (const skill of omxSkills) {
    if (!seen.has(skill.name)) {
      seen.add(skill.name);
      result.push(skill);
    }
  }
  for (const skill of claudeSkills) {
    if (!seen.has(skill.name)) {
      seen.add(skill.name);
      result.push(skill);
    }
  }

  return result;
}

export function removeSkill(location: string): void {
  const dir = dirname(location);
  rmSync(dir, {recursive: true, force: true});
}
