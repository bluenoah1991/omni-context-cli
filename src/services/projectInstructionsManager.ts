import fs from 'node:fs';
import path from 'node:path';
import { buildProjectInstructionsPrompt } from '../prompts/projectInstructionsPromptBuilder';
import { Provider } from '../types/config';
import { Session } from '../types/session';
import { getOmxFilePath } from '../utils/omxPaths';
import { addUserMessage } from './sessionManager';

const INSTRUCTION_FILES = ['OMX.md', 'CLAUDE.md'] as const;

type ProjectInstructions = {content: string; filename: string;} | null;

function findProjectInstructions(): ProjectInstructions {
  const cwd = process.cwd();

  for (const filename of INSTRUCTION_FILES) {
    const filePath = path.join(cwd, filename);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content.trim()) {
          return {content, filename};
        }
      } catch {}
    }
  }

  const userOmxPath = getOmxFilePath('OMX.md');
  if (fs.existsSync(userOmxPath)) {
    try {
      const content = fs.readFileSync(userOmxPath, 'utf-8');
      if (content.trim()) {
        return {content, filename: 'OMX.md'};
      }
    } catch {}
  }

  return null;
}

export function injectProjectInstructions(session: Session, provider: Provider): Session {
  const instructions = findProjectInstructions();
  if (!instructions) {
    return session;
  }

  const message = buildProjectInstructionsPrompt(instructions.content, instructions.filename);
  return addUserMessage(session, message, provider);
}
