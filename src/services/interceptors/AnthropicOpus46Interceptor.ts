import { ModelConfig } from '../../types/config';
import { RequestInterceptor } from '../requestInterceptor';

export class AnthropicOpus46Interceptor implements RequestInterceptor {
  shouldIntercept(model: ModelConfig): boolean {
    return model.provider === 'anthropic'
      && (model.name.includes('opus-4-6') || model.name.includes('opus-4.6'));
  }

  interceptRequest(request: Record<string, unknown>, model: ModelConfig): Record<string, unknown> {
    const result = {...request};

    const thinking = result.thinking as {type: string;} | undefined;
    if (thinking?.type === 'adaptive' && model.contextSize > 200) {
      result.output_config = {effort: 'max'};
      result.max_tokens = 128000;
    }

    return result;
  }
}
