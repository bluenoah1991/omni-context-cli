import { ModelConfig } from '../../types/config';
import { RequestInterceptor } from '../requestInterceptor';

export class MiniMaxInterceptor implements RequestInterceptor {
  shouldIntercept(model: ModelConfig): boolean {
    return model.provider === 'openai' && model.apiUrl.includes('api.minimaxi.com');
  }

  interceptRequest(request: Record<string, unknown>, _model: ModelConfig): Record<string, unknown> {
    const messages = request.messages as any[];
    const filteredMessages = messages?.map(message => {
      const {reasoning_content, ...restMessage} = message;
      return restMessage;
    });

    return {...request, messages: filteredMessages, reasoning_split: true};
  }
}
