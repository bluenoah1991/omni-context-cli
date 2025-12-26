import { buildSystemPrompt } from '../prompts/systemPromptBuilder.js';
import { AnthropicMessage } from '../types/anthropicMessage';
import { ModelConfig } from '../types/config';
import { ToolFilter } from '../types/tool';
import { loadOmxConfig } from './configManager';
import { applyInterceptors } from './requestInterceptor';
import { getTools } from './toolExecutor';

export async function buildAnthropicRequest(
  model: ModelConfig,
  messages: AnthropicMessage[],
  toolFilter?: ToolFilter,
): Promise<{headers: Record<string, string>; body: Record<string, unknown>;}> {
  const config = loadOmxConfig();
  const systemBlocks = [{text: buildSystemPrompt(config.specialistMode), type: 'text'}];

  const request: Record<string, unknown> = {
    model: model.name,
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

  const tools = await getTools(toolFilter);

  if (tools.length) {
    request.tools = tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: {type: 'object', ...tool.parameters},
    }));
  }

  const body = applyInterceptors(request, model);

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': model.apiKey,
    'anthropic-version': '2023-06-01',
  };

  return {headers, body};
}
