import fs from 'node:fs';
import { ModelConfig } from '../../types/config';
import { getOmxFilePath } from '../../utils/omxPaths';
import { RequestInterceptor } from '../requestInterceptor';

interface ZenmuxConfig {
  model_routing_config?: Record<string, unknown>;
}

let cachedConfig: ZenmuxConfig | null = null;

function loadConfig(): ZenmuxConfig {
  if (cachedConfig !== null) {
    return cachedConfig;
  }

  let config: ZenmuxConfig = {};
  try {
    config = JSON.parse(fs.readFileSync(getOmxFilePath('zenmux.json'), 'utf-8'));
  } catch {}

  cachedConfig = config;
  return config;
}

export class ZenmuxInterceptor implements RequestInterceptor {
  shouldIntercept(model: ModelConfig): boolean {
    return model.name === 'zenmux/auto';
  }

  interceptRequest(request: Record<string, unknown>, _model: ModelConfig): Record<string, unknown> {
    const config = loadConfig();

    if (config?.model_routing_config) {
      return {...request, model_routing_config: config.model_routing_config};
    }

    return request;
  }
}
