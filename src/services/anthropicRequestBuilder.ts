import { buildSystemPrompt } from '../prompts/systemPromptBuilder.js';
import { AnthropicMessage } from '../types/anthropicMessage';
import { ModelConfig } from '../types/config';
import { ToolFilter } from '../types/tool';
import { editAnthropicContext } from '../utils/contextEditor';
import { unwrapPromptMessage } from '../utils/messagePreprocessor';
import { loadAppConfig } from './configManager';
import { applyInterceptors } from './requestInterceptor';
import { getTools } from './toolExecutor';

export async function buildAnthropicRequest(
  model: ModelConfig,
  messages: AnthropicMessage[],
  toolFilter?: ToolFilter,
  skipSystemPrompt?: boolean,
  sessionId?: string,
): Promise<{headers: Record<string, string>; body: Record<string, unknown>;}> {
  const config = loadAppConfig();
  const cacheControl = config.cacheTtl === '1h'
    ? {type: 'ephemeral', ttl: '1h'}
    : {type: 'ephemeral'};

  const editedMessages = editAnthropicContext(messages);

  const preprocessedMessages = editedMessages.filter(message => {
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
          content: message.content.map(block => {
            if (block.type === 'text') {
              return {...block, text: unwrapPromptMessage(block.text)};
            }
            if (block.type === 'tool_result') {
              if (typeof block.content === 'string') {
                try {
                  const {displayText, ...rest} = JSON.parse(block.content);
                  return {...block, content: JSON.stringify(rest)};
                } catch {
                  return {...block};
                }
              }
              if (Array.isArray(block.content)) {
                const content = block.content.map(part => {
                  if (part.type === 'text') {
                    try {
                      const {displayText, ...rest} = JSON.parse(part.text);
                      return {...part, text: JSON.stringify(rest)};
                    } catch {
                      return part;
                    }
                  }
                  return part;
                });
                return {...block, content};
              }
            }
            return {...block};
          }),
        };
      }
    }
    if (Array.isArray(message.content)) {
      return {role: message.role, content: message.content.map(block => ({...block}))};
    }
    return {role: message.role, content: message.content};
  });

  for (const message of preprocessedMessages.slice(-2)) {
    if (typeof message.content === 'string') {
      message.content = [{type: 'text', text: message.content, cache_control: cacheControl}] as any;
    } else if (Array.isArray(message.content)) {
      const block = message.content.findLast(b => b.type !== 'thinking') ?? message.content.at(-1);
      if (block) {
        (block as any).cache_control = cacheControl;
      }
    }
  }

  const request: Record<string, unknown> = {
    model: model.name,
    messages: preprocessedMessages,
    stream: true,
    max_tokens: 32000,
  };

  if (!skipSystemPrompt) {
    request.system = [{
      text: buildSystemPrompt(config.specialistMode),
      type: 'text',
      cache_control: cacheControl,
    }];
  }

  if (config.clientId && sessionId) {
    request.metadata = {user_id: `${config.clientId}_${sessionId}`};
  }

  if (config.enableThinking) {
    request.thinking = {type: 'enabled', budget_tokens: 31999};
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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': model.apiKey,
    'anthropic-version': '2023-06-01',
  };

  if (config.enableThinking) {
    headers['anthropic-beta'] = 'interleaved-thinking-2025-05-14';
  }

  return {headers, body};
}
