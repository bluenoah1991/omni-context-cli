import fs from 'node:fs';
import { ensureProjectDir, getProjectFilePath } from '../utils/omxPaths';

const MAX_HISTORY = 100;
const HISTORY_FILENAME = 'input-history.json';

let history: string[] = [];
let historyFile: string | null = null;

export function initializeInputHistory(): void {
  ensureProjectDir();
  historyFile = getProjectFilePath(HISTORY_FILENAME);
  loadHistory();
}

function loadHistory(): void {
  if (!historyFile) return;
  try {
    if (fs.existsSync(historyFile)) {
      const content = fs.readFileSync(historyFile, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        history = parsed.slice(-MAX_HISTORY);
      }
    } else {
      history = [];
    }
  } catch {
    history = [];
  }
}

function saveHistory(): void {
  if (!historyFile) return;
  ensureProjectDir();
  fs.writeFileSync(historyFile, JSON.stringify(history), 'utf-8');
}

export function getInputHistory(): string[] {
  return history;
}

export function addToInputHistory(input: string): void {
  const trimmed = input.trim();
  if (!trimmed) return;
  if (history.length > 0 && history[history.length - 1] === trimmed) return;
  history.push(trimmed);
  if (history.length > MAX_HISTORY) {
    history = history.slice(-MAX_HISTORY);
  }
  saveHistory();
}

export function getInputHistoryLength(): number {
  return history.length;
}
