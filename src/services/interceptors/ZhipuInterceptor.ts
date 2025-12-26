import { ModelConfig } from '../../types/config';
import { loadAppConfig } from '../configManager';
import { RequestInterceptor } from '../requestInterceptor';

export class ZhipuInterceptor implements RequestInterceptor {
  shouldIntercept(model: ModelConfig): boolean {
    return model.provider === 'openai' && model.apiUrl.includes('open.bigmodel.cn');
  }

  interceptRequest(request: Record<string, unknown>, _model: ModelConfig): Record<string, unknown> {
    const config = loadAppConfig();
    return {...request, thinking: {type: config.enableThinking ? 'enabled' : 'disabled'}};
  }
}
