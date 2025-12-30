import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FunctionalSlashResult, SlashCommand } from '../types/slash';
import { functionalSlashHandlers } from './slashHandlers';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const BUILTIN_SLASH_DIR = path.join(scriptDir, 'slash');
const USER_SLASH_DIR = path.join(os.homedir(), '.omx', 'slash');

function loadSlashFromDir(dir: string): SlashCommand[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

  return files.map(file => {
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    return {name: path.basename(file, '.md'), prompt: content.trim()};
  });
}

function loadSlashCommands(): SlashCommand[] {
  const builtinSlash = loadSlashFromDir(BUILTIN_SLASH_DIR);

  if (!fs.existsSync(USER_SLASH_DIR)) {
    fs.mkdirSync(USER_SLASH_DIR, {recursive: true});
  }
  const userSlash = loadSlashFromDir(USER_SLASH_DIR);

  const builtinNames = new Set(builtinSlash.map(s => s.name));
  const filtered = userSlash.filter(s => !builtinNames.has(s.name));

  return [...builtinSlash, ...filtered];
}

let cachedCommands: SlashCommand[] | null = null;

function getSlashCommands(): SlashCommand[] {
  if (!cachedCommands) {
    cachedCommands = loadSlashCommands();
  }
  return cachedCommands;
}

export function parseSlashCommand(input: string): FunctionalSlashResult | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) {
    return null;
  }

  const spaceIndex = trimmed.indexOf(' ');
  const commandName = spaceIndex === -1 ? trimmed.slice(1) : trimmed.slice(1, spaceIndex);
  const argument = spaceIndex === -1 ? '' : trimmed.slice(spaceIndex + 1).trim();

  if (functionalSlashHandlers[commandName]) {
    return {type: 'functional', execute: functionalSlashHandlers[commandName]};
  }

  const commands = getSlashCommands();
  const command = commands.find(c => c.name === commandName);

  if (!command) {
    return null;
  }

  const prompt = command.prompt.replace(/\{\{argument\}\}/g, argument);

  return {type: 'prompt', prompt};
}
