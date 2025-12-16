import systemPrompt from '../prompts/system.txt';
import { AnthropicMessage } from '../types/anthropicMessage';
import { AppConfig } from '../types/config';
import { applyInterceptors } from './requestInterceptor';
import { getTools } from './toolExecutor';

export async function buildAnthropicRequest(
  config: AppConfig,
  messages: AnthropicMessage[],
): Promise<{headers: Record<string, string>; body: Record<string, unknown>;}> {
  const systemBlocks = [{text: systemPrompt, type: 'text'}];

  const request: Record<string, unknown> = {
    model: config.model,
    messages: messages.filter(message => {
      if (message.role !== 'assistant') return true;
      return Array.isArray(message.content) ? message.content.length > 0 : Boolean(message.content);
    }).map(message => ({role: message.role, content: message.content})),
    stream: true,
    max_tokens: config.enableThinking ? 16000 : 4096,
    system: systemBlocks,
  };

  if (config.enableThinking) {
    request.thinking = {type: 'enabled', budget_tokens: 10000};
  }

  const tools = await getTools();
  if (tools.length) {
    request.tools = tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: {type: 'object', ...tool.parameters},
    }));
  }

  const body = applyInterceptors(request, config);

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': config.apiKey,
    'anthropic-version': '2023-06-01',
  };

  return {headers, body};
}
