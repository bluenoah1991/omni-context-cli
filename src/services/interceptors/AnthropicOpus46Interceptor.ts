import { ModelConfig } from '../../types/config';
import { InterceptorResult, RequestInterceptor } from '../requestInterceptor';

export class AnthropicOpus46Interceptor implements RequestInterceptor {
  shouldIntercept(model: ModelConfig): boolean {
    return model.provider === 'anthropic'
      && (model.name.includes('opus-4-6') || model.name.includes('opus-4.6'));
  }

  interceptRequest(
    body: Record<string, unknown>,
    headers: Record<string, string>,
    model: ModelConfig,
  ): InterceptorResult {
    const newBody = {...body};

    const thinking = newBody.thinking as {type: string;} | undefined;
    if (thinking?.type === 'adaptive' && model.contextSize > 200) {
      newBody.output_config = {effort: 'max'};
      newBody.max_tokens = 128000;
    }

    return {body: newBody, headers};
  }
}
