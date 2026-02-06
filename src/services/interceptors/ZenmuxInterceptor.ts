import fs from 'node:fs';
import { ModelConfig } from '../../types/config';
import { getOmxFilePath } from '../../utils/omxPaths';
import { InterceptorResult, RequestInterceptor } from '../requestInterceptor';

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

  interceptRequest(
    body: Record<string, unknown>,
    headers: Record<string, string>,
    _model: ModelConfig,
  ): InterceptorResult {
    const config = loadConfig();

    if (config?.model_routing_config) {
      return {body: {...body, model_routing_config: config.model_routing_config}, headers};
    }

    return {body, headers};
  }
}
