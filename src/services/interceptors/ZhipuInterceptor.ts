import { ModelConfig } from '../../types/config';
import { loadAppConfig } from '../configManager';
import { InterceptorResult, RequestInterceptor } from '../requestInterceptor';

export class ZhipuInterceptor implements RequestInterceptor {
  shouldIntercept(model: ModelConfig): boolean {
    return model.provider === 'openai' && model.apiUrl.includes('open.bigmodel.cn');
  }

  interceptRequest(
    body: Record<string, unknown>,
    headers: Record<string, string>,
    _model: ModelConfig,
  ): InterceptorResult {
    const config = loadAppConfig();
    return {
      body: {
        ...body,
        thinking: {type: config.enableThinking ? 'enabled' : 'disabled', clear_thinking: false},
      },
      headers,
    };
  }
}
