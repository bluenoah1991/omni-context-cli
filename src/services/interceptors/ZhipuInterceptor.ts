import { ModelConfig } from '../../types/config';
import { loadOmxConfig } from '../configManager';
import { RequestInterceptor } from '../requestInterceptor';

export class ZhipuInterceptor implements RequestInterceptor {
  shouldIntercept(model: ModelConfig): boolean {
    return model.provider === 'openai' && model.apiUrl.includes('open.bigmodel.cn');
  }

  interceptRequest(request: Record<string, unknown>, _model: ModelConfig): Record<string, unknown> {
    const config = loadOmxConfig();
    return {...request, thinking: {type: config.enableThinking ? 'enabled' : 'disabled'}};
  }
}
