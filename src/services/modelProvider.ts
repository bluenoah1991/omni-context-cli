import type { ModelProvider } from '../types/config';
import { readGlobalConfig, writeGlobalConfig } from './configManager';

const providers = new Map<string, ModelProvider>();

export function registerModelProvider(provider: ModelProvider): void {
  providers.set(provider.id, provider);
}

export function getModelProvider(id: string): ModelProvider | undefined {
  return providers.get(id);
}

export function getAllModelProviders(): ModelProvider[] {
  return Array.from(providers.values());
}

export async function addProviderModels(providerId: string, apiKey: string): Promise<number> {
  const provider = providers.get(providerId);
  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  const models = await provider.listModels(apiKey);
  const global = readGlobalConfig();
  if (!global.models) global.models = [];

  global.models = global.models.filter(m => m.source !== providerId);

  for (const model of models) {
    model.source = providerId;
    global.models.push(model);
  }

  writeGlobalConfig(global);
  return models.length;
}

export function removeProviderModels(providerId: string): number {
  const global = readGlobalConfig();
  if (!global.models) return 0;
  const before = global.models.length;
  global.models = global.models.filter(m => m.source !== providerId);
  writeGlobalConfig(global);
  return before - global.models.length;
}
