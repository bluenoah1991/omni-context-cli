import { buildSystemPrompt } from '../prompts/systemPromptBuilder.js';
import { AnthropicMessage } from '../types/anthropicMessage';
import { ModelConfig } from '../types/config';
import { ToolFilter } from '../types/tool';
import { unwrapPromptMessage } from '../utils/messagePreprocessor';
import { loadAppConfig } from './configManager';
import { applyInterceptors } from './requestInterceptor';
import { getTools } from './toolExecutor';

export async function buildAnthropicRequest(
  model: ModelConfig,
  messages: AnthropicMessage[],
  toolFilter?: ToolFilter,
  skipSystemPrompt?: boolean,
): Promise<{headers: Record<string, string>; body: Record<string, unknown>;}> {
  const config = loadAppConfig();
  const systemBlocks = skipSystemPrompt
    ? []
    : [{
      text: buildSystemPrompt(config.specialistMode),
      type: 'text',
      cache_control: {type: 'ephemeral'},
    }];

  const preprocessedMessages = messages.filter(message => {
    if (message.role !== 'assistant') return true;
    return Array.isArray(message.content) ? message.content.length > 0 : Boolean(message.content);
  }).map(message => {
    if (message.role === 'user') {
      if (typeof message.content === 'string') {
        return {role: message.role, content: unwrapPromptMessage(message.content)};
      }
      if (Array.isArray(message.content)) {
        return {
          role: message.role,
          content: message.content.map(block =>
            block.type === 'text' ? {...block, text: unwrapPromptMessage(block.text)} : {...block}
          ),
        };
      }
    }
    if (Array.isArray(message.content)) {
      return {role: message.role, content: message.content.map(block => ({...block}))};
    }
    return {role: message.role, content: message.content};
  });

  const lastMessage = preprocessedMessages.at(-1)!;
  if (typeof lastMessage.content === 'string') {
    lastMessage.content = [{
      type: 'text',
      text: lastMessage.content,
      cache_control: {type: 'ephemeral'},
    }] as any;
  } else if (Array.isArray(lastMessage.content)) {
    const block = lastMessage.content.findLast(b => b.type !== 'thinking');
    if (block) {
      (block as any).cache_control = {type: 'ephemeral'};
    }
  }

  const request: Record<string, unknown> = {
    model: model.name,
    messages: preprocessedMessages,
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
