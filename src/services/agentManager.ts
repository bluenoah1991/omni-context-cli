import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AgentDefinition } from '../types/agent';
import { parseFrontmatter } from '../utils/frontmatter';
import { getLocalOmxFilePath, getOmxFilePath } from '../utils/omxPaths';
import { executeAgent } from './agentExecutor';
import { registerTool } from './toolExecutor';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const BUILTIN_AGENTS_DIR = path.join(scriptDir, 'agents');
const USER_AGENTS_DIR = getOmxFilePath('agents');
const LOCAL_AGENTS_DIR = getLocalOmxFilePath('agents');

function loadAgentsFromDir(dir: string, builtin = false): AgentDefinition[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

  return files.map(file => {
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    const {data: metadata, content: body} = parseFrontmatter(content);

    return {
      name: metadata.name || path.basename(file, '.md'),
      description: metadata.description || '',
      promptTemplate: body.trim(),
      allowedTools: metadata.allowedTools,
      parameters: metadata.parameters || {properties: {}},
      builtin,
    };
  });
}

function loadAgents(): AgentDefinition[] {
  const builtinAgents = loadAgentsFromDir(BUILTIN_AGENTS_DIR, true);

  const userAgents = loadAgentsFromDir(USER_AGENTS_DIR);
  const localAgents = loadAgentsFromDir(LOCAL_AGENTS_DIR);

  const seen = new Set<string>();
  const result: AgentDefinition[] = [];

  for (const agent of builtinAgents) {
    seen.add(agent.name);
    result.push(agent);
  }
  for (const agent of localAgents) {
    if (!seen.has(agent.name)) {
      seen.add(agent.name);
      result.push(agent);
    }
  }
  for (const agent of userAgents) {
    if (!seen.has(agent.name)) {
      seen.add(agent.name);
      result.push(agent);
    }
  }

  return result;
}

export function registerAgents(): void {
  const agents = loadAgents();
  agents.forEach(agent => {
    registerTool({
      name: `agent_${agent.name}`,
      description: agent.description,
      parameters: agent.parameters,
      builtin: agent.builtin,
      formatCall: (args: Record<string, unknown>) => {
        const values = Object.values(args).filter(v => v !== undefined && v !== null);
        if (values.length === 0) return agent.name;
        const formatted = values.map(v => String(v)).join(' ');
        return formatted.length > 50 ? formatted.slice(0, 47) + '...' : formatted;
      },
    }, async (args, signal, callbacks) => {
      return executeAgent(agent, args, signal, callbacks);
    });
  });
}
