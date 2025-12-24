import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AgentDefinition } from '../types/agent';
import { parseFrontmatter } from '../utils/frontmatter';
import { executeAgent } from './agentExecutor';
import { registerTool } from './toolExecutor';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const BUILTIN_AGENTS_DIR = path.join(scriptDir, 'agents');
const USER_AGENTS_DIR = path.join(os.homedir(), '.omx', 'agents');

function loadAgentsFromDir(dir: string): AgentDefinition[] {
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
    };
  });
}

function loadAgents(): AgentDefinition[] {
  const builtinAgents = loadAgentsFromDir(BUILTIN_AGENTS_DIR);

  if (!fs.existsSync(USER_AGENTS_DIR)) {
    fs.mkdirSync(USER_AGENTS_DIR, {recursive: true});
  }
  const userAgents = loadAgentsFromDir(USER_AGENTS_DIR);

  return [...builtinAgents, ...userAgents];
}

export function registerAgents(): void {
  const agents = loadAgents();
  agents.forEach(agent => {
    registerTool({
      name: `agent_${agent.name}`,
      description: agent.description,
      parameters: agent.parameters,
    }, async (args, signal) => {
      const callbacks = {
        onContent: () => {},
        onThinking: () => {},
        onToolCall: () => {},
        onToolResult: () => {},
      };
      return executeAgent(agent, args, callbacks, signal);
    });
  });
}
