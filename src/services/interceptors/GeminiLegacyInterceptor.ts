import { ModelConfig } from '../../types/config';
import { InterceptorResult, RequestInterceptor } from '../requestInterceptor';

function isLegacyModel(name: string): boolean {
  return /gemini[- ](?:2\.\d|1\.\d)[- ]/.test(name);
}

export class GeminiLegacyInterceptor implements RequestInterceptor {
  shouldIntercept(model: ModelConfig): boolean {
    return model.provider === 'gemini' && isLegacyModel(model.name);
  }

  interceptRequest(
    body: Record<string, unknown>,
    headers: Record<string, string>,
    _model: ModelConfig,
  ): InterceptorResult {
    const newBody = {...body};

    const genConfig = newBody.generationConfig as Record<string, unknown> | undefined;
    const thinkingConfig = genConfig?.thinkingConfig as Record<string, unknown> | undefined;
    if (thinkingConfig && 'thinkingLevel' in thinkingConfig) {
      delete thinkingConfig.thinkingLevel;
      thinkingConfig.thinkingBudget = 24576;
    }

    return {body: newBody, headers};
  }
}
