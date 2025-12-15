import { AppConfig } from '../../types/config';
import { RequestInterceptor } from '../requestInterceptor';

export class MiniMaxInterceptor implements RequestInterceptor {
  shouldIntercept(config: AppConfig): boolean {
    return config.provider === 'openai' && config.apiUrl.includes('api.minimaxi.com');
  }

  interceptRequest(request: Record<string, unknown>): Record<string, unknown> {
    const messages = request.messages as any[];
    const filteredMessages = messages?.map(message => {
      const {reasoning_content, ...restMessage} = message;
      return restMessage;
    });

    return {...request, messages: filteredMessages, reasoning_split: true};
  }
}
