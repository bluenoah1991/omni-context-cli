import { buildSystemPrompt } from '../prompts/systemPromptBuilder.js';
import { ModelConfig } from '../types/config';
import { OpenAIMessage } from '../types/openaiMessage';
import { ToolFilter } from '../types/tool';
import { editOpenAIContext } from '../utils/contextEditor';
import { unwrapPromptMessage } from '../utils/messagePreprocessor';
import { loadAppConfig } from './configManager';
import { applyInterceptors } from './requestInterceptor';
import { getTools } from './toolExecutor';

export async function buildOpenAIRequest(
  model: ModelConfig,
  messages: OpenAIMessage[],
  toolFilter?: ToolFilter,
  skipSystemPrompt?: boolean,
  isFromAgent?: boolean,
): Promise<{headers: Record<string, string>; body: Record<string, unknown>;}> {
  const config = loadAppConfig();
  const systemMessages = skipSystemPrompt
    ? []
    : [{role: 'system', content: buildSystemPrompt(config.specialistMode, isFromAgent)}];

  const editedMessages = editOpenAIContext(messages);

  const request: Record<string, unknown> = {
    model: model.name,
    messages: [
      ...systemMessages,
      ...editedMessages.filter(message => {
        if (message.role !== 'assistant') return true;
        if (message.tool_calls) return true;
        return Array.isArray(message.content)
          ? message.content.length > 0
          : Boolean(message.content);
      }).map(message => {
        let content = message.content;
        if (message.role === 'user') {
          if (typeof content === 'string') {
            content = unwrapPromptMessage(content);
          } else if (Array.isArray(content)) {
            content = content.map(part =>
              part.type === 'text' ? {...part, text: unwrapPromptMessage(part.text)} : {...part}
            );
          }
        }
        if (message.role === 'tool') {
          if (typeof content === 'string') {
            try {
              const {displayText, ...rest} = JSON.parse(content);
              content = JSON.stringify(rest);
            } catch {}
          } else if (Array.isArray(content)) {
            content = content.map(part => {
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
          }
        }
        if (Array.isArray(content)) {
          content = content.map(part => ({...part}));
        }
        return {
          role: message.role,
          ...(content && {content}),
          ...(message.tool_calls && {tool_calls: message.tool_calls}),
          ...(message.tool_call_id && {tool_call_id: message.tool_call_id}),
          ...(message.reasoning && {reasoning: message.reasoning}),
          ...(message.reasoning_content && {reasoning_content: message.reasoning_content}),
          ...(message.reasoning_details && {reasoning_details: message.reasoning_details}),
        };
      }),
    ],
    stream: true,
    stream_options: {include_usage: true},
  };

  if (config.enableThinking) {
    request.reasoning_effort = 'high';
  }

  const tools = await getTools(toolFilter);

  if (tools.length) {
    request.tools = tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {type: 'object', ...tool.parameters},
      },
    }));
  }

  const body = applyInterceptors(request, model);

  const headers = {'Content-Type': 'application/json', Authorization: `Bearer ${model.apiKey}`};

  return {headers, body};
}
