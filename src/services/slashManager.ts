import Handlebars from 'handlebars';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SlashCommand } from '../types/slash';
import { parseFrontmatter } from '../utils/frontmatter';
import { getLocalOmxFilePath, getOmxFilePath } from '../utils/omxPaths';
import { getFunctionalSlashCommands } from './slashHandlers';

Handlebars.registerHelper('eq', (a, b) => a === b);

function interpolatePrompt(template: string, params: Record<string, any>): string {
  const compiled = Handlebars.compile(template);
  return compiled(params);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const BUILTIN_SLASH_DIR = path.join(scriptDir, 'slash');
const USER_SLASH_DIR = getOmxFilePath('slash');
const LOCAL_SLASH_DIR = getLocalOmxFilePath('slash');

function loadSlashFromDir(dir: string): SlashCommand[] {
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
      type: 'prompt' as const,
      prompt: body.trim(),
    };
  });
}

function loadSlashCommands(): SlashCommand[] {
  const builtinSlash = loadSlashFromDir(BUILTIN_SLASH_DIR);
  const userSlash = loadSlashFromDir(USER_SLASH_DIR);
  const localSlash = loadSlashFromDir(LOCAL_SLASH_DIR);

  const seen = new Set<string>();
  const result: SlashCommand[] = [];

  for (const cmd of builtinSlash) {
    seen.add(cmd.name);
    result.push(cmd);
  }
  for (const cmd of localSlash) {
    if (!seen.has(cmd.name)) {
      seen.add(cmd.name);
      result.push(cmd);
    }
  }
  for (const cmd of userSlash) {
    if (!seen.has(cmd.name)) {
      seen.add(cmd.name);
      result.push(cmd);
    }
  }

  return result;
}

let cachedCommands: SlashCommand[] | null = null;

function getSlashCommands(): SlashCommand[] {
  if (!cachedCommands) {
    cachedCommands = loadSlashCommands();
  }
  return cachedCommands;
}

export function parseSlashCommand(input: string): SlashCommand | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) {
    return null;
  }

  const spaceIndex = trimmed.indexOf(' ');
  const commandName = spaceIndex === -1 ? trimmed.slice(1) : trimmed.slice(1, spaceIndex);
  const argument = spaceIndex === -1 ? '' : trimmed.slice(spaceIndex + 1).trim();

  const functionalCommand = getFunctionalSlashCommands().find(c => c.name === commandName);
  if (functionalCommand) {
    return functionalCommand;
  }

  const commands = getSlashCommands();
  const command = commands.find(c => c.name === commandName);

  if (!command) {
    return null;
  }

  const prompt = interpolatePrompt(command.prompt!, {argument});

  return {...command, prompt};
}

export function getAllSlashCommands(): SlashCommand[] {
  const commands = getSlashCommands();
  return [...getFunctionalSlashCommands(), ...commands];
}
