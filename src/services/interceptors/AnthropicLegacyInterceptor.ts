import { ModelConfig } from '../../types/config';
import { RequestInterceptor } from '../requestInterceptor';

export class AnthropicLegacyInterceptor implements RequestInterceptor {
  shouldIntercept(model: ModelConfig): boolean {
    return model.provider === 'anthropic' && !model.name.includes('opus-4-6')
      && !model.name.includes('opus-4.6');
  }

  interceptRequest(request: Record<string, unknown>): Record<string, unknown> {
    const result = {...request};

    const thinking = result.thinking as {type: string;} | undefined;
    if (thinking?.type === 'adaptive') {
      result.thinking = {type: 'enabled', budget_tokens: 31999};
    }

    if (result.context_management) {
      delete result.context_management;
    }

    return result;
  }
}
