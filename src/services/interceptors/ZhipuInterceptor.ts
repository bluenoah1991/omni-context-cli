import { AppConfig } from '../../types/config';
import { RequestInterceptor } from '../requestInterceptor';

export class ZhipuInterceptor implements RequestInterceptor {
  shouldIntercept(config: AppConfig): boolean {
    return config.provider === 'openai' && config.apiUrl.includes('open.bigmodel.cn');
  }

  interceptRequest(request: Record<string, unknown>, config: AppConfig): Record<string, unknown> {
    return {...request, thinking: {type: config.enableThinking ? 'enabled' : 'disabled'}};
  }
}
