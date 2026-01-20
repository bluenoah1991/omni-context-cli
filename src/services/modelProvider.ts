import { ModelConfig } from '../types/config';
import { loadAppConfig, saveAppConfig } from './configManager';

export interface ModelProvider {
  readonly id: string;
  readonly name: string;
  listModels(apiKey: string): Promise<ModelConfig[]>;
}

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
  const config = loadAppConfig();

  config.models = config.models.filter(m => m.source !== providerId);

  for (const model of models) {
    model.source = providerId;
    config.models.push(model);
  }

  saveAppConfig(config);
  return models.length;
}

export function removeProviderModels(providerId: string): number {
  const config = loadAppConfig();
  const before = config.models.length;
  config.models = config.models.filter(m => m.source !== providerId);
  saveAppConfig(config);
  return before - config.models.length;
}
