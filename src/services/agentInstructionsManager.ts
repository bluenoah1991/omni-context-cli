import fs from 'node:fs';
import path from 'node:path';
import { buildAgentInstructionsPrompt } from '../prompts/agentInstructionsPromptBuilder';
import { Provider } from '../types/config';
import { Session } from '../types/session';
import { getOmxFilePath } from '../utils/omxPaths';
import { addUserMessage } from './sessionManager';

const INSTRUCTION_FILE = 'OMX-AGENTS.md';

type AgentInstructions = {content: string; filename: string;} | null;

function findAgentInstructions(): AgentInstructions {
  const cwd = process.cwd();
  const localPath = path.join(cwd, INSTRUCTION_FILE);

  if (fs.existsSync(localPath)) {
    try {
      const content = fs.readFileSync(localPath, 'utf-8');
      if (content.trim()) {
        return {content, filename: INSTRUCTION_FILE};
      }
    } catch {}
  }

  const userPath = getOmxFilePath(INSTRUCTION_FILE);
  if (fs.existsSync(userPath)) {
    try {
      const content = fs.readFileSync(userPath, 'utf-8');
      if (content.trim()) {
        return {content, filename: INSTRUCTION_FILE};
      }
    } catch {}
  }

  return null;
}

export function injectAgentInstructions(session: Session, provider: Provider): Session {
  const instructions = findAgentInstructions();
  if (!instructions) {
    return session;
  }

  const message = buildAgentInstructionsPrompt(instructions.content, instructions.filename);
  return addUserMessage(session, message, provider);
}
