import { ModelConfig } from '../../types/config';
import { InterceptorResult, RequestInterceptor } from '../requestInterceptor';

function isNextModel(name: string): boolean {
  return /(?:opus|sonnet)-4[._-]6/.test(name);
}

export class AnthropicNextInterceptor implements RequestInterceptor {
  shouldIntercept(model: ModelConfig): boolean {
    return model.provider === 'anthropic' && isNextModel(model.name);
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
