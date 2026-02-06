import { ModelConfig } from '../../types/config';
import { InterceptorResult, RequestInterceptor } from '../requestInterceptor';

export class MiniMaxInterceptor implements RequestInterceptor {
  shouldIntercept(model: ModelConfig): boolean {
    return model.provider === 'openai' && model.apiUrl.includes('api.minimaxi.com');
  }

  interceptRequest(
    body: Record<string, unknown>,
    headers: Record<string, string>,
    _model: ModelConfig,
  ): InterceptorResult {
    const messages = body.messages as any[];
    const filteredMessages = messages?.map(message => {
      const {reasoning_content, ...restMessage} = message;
      return restMessage;
    });

    return {body: {...body, messages: filteredMessages, reasoning_split: true}, headers};
  }
}
