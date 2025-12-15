import { AppConfig, Provider } from '../types/config';

const ENV_PREFIX = 'OMNI_CONTEXT_';

function getEnv(key: string): string {
  return process.env[`${ENV_PREFIX}${key}`] || '';
}

function detectProvider(apiUrl: string, provider?: string): Provider {
  if (provider === 'anthropic' || provider === 'openai') return provider;
  if (apiUrl.includes('anthropic')) return 'anthropic';
  return 'openai';
}

export function loadConfig(): AppConfig {
  const apiUrl = getEnv('API_URL');
  const providerHint = getEnv('PROVIDER');
  const provider = detectProvider(apiUrl, providerHint);

  return {
    provider,
    apiUrl,
    model: getEnv('MODEL'),
    apiKey: getEnv('API_KEY'),
    enableThinking: getEnv('ENABLE_THINKING') === 'true',
  };
}

export function getConfigDisplay(config: AppConfig): string {
  const masked = config.apiKey ? '****' + config.apiKey.slice(-4) : 'not set';
  return `Provider: ${config.provider} | Model: ${config.model || 'not set'} | API Key: ${masked}`;
}
