import fs from 'node:fs';
import { ensureDir, getOmxDir, getOmxFilePath } from '../utils/omxPaths';

const HISTORY_FILE = 'input-history.json';
const MAX_HISTORY = 20;

let history: string[] = [];

function loadHistory(): void {
  ensureDir(getOmxDir());
  const filePath = getOmxFilePath(HISTORY_FILE);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        history = parsed.slice(-MAX_HISTORY);
      }
    }
  } catch {
    history = [];
  }
}

function saveHistory(): void {
  ensureDir(getOmxDir());
  fs.writeFileSync(getOmxFilePath(HISTORY_FILE), JSON.stringify(history), 'utf-8');
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

loadHistory();
