import { ModelConfig } from '../../types/config';
import { InterceptorResult, RequestInterceptor } from '../requestInterceptor';

export class KimiInterceptor implements RequestInterceptor {
  shouldIntercept(model: ModelConfig): boolean {
    try {
      return new URL(model.apiUrl).hostname === 'api.kimi.com';
    } catch {
      return false;
    }
  }

  interceptRequest(
    body: Record<string, unknown>,
    headers: Record<string, string>,
    model: ModelConfig,
  ): InterceptorResult {
    const newHeaders = {...headers};
    newHeaders['user-agent'] = model.provider === 'anthropic'
      ? 'claude-cli/2.1.59 (external, cli)'
      : 'KimiCLI/1.17.0';
    return {body, headers: newHeaders};
  }
}
