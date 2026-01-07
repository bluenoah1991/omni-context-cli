import fs from 'node:fs';
import path from 'node:path';
import { TokenUsage } from '../types/streamCallbacks';
import { ensureDir, getOmxDir } from '../utils/omxPaths';

const COST_DIR = path.join(getOmxDir(), 'cost');

let costAnalysisEnabled = false;

export function enableCostAnalysis(): void {
  costAnalysisEnabled = true;
}

function ensureCostFile(sessionId: string): string {
  ensureDir(COST_DIR);
  const filePath = path.join(COST_DIR, `${sessionId}.csv`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(
      filePath,
      'time,model_id,input_tokens,output_tokens,cache_creation_tokens,cache_read_tokens\n',
      'utf-8',
    );
  }
  return filePath;
}

export function appendTokenUsage(sessionId: string, modelId: string, usage: TokenUsage): void {
  if (!costAnalysisEnabled) return;

  const filePath = ensureCostFile(sessionId);
  const timestamp = new Date().toISOString();
  const row =
    `${timestamp},${modelId},${usage.inputTokens},${usage.outputTokens},${usage.cacheCreationTokens},${usage.cacheReadTokens}\n`;
  fs.appendFileSync(filePath, row, 'utf-8');
}
