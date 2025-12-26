import { buildSystemPrompt } from '../prompts/systemPromptBuilder.js';
import { ModelConfig } from '../types/config';
import { OpenAIMessage } from '../types/openaiMessage';
import { ToolFilter } from '../types/tool';
import { loadAppConfig } from './configManager';
import { applyInterceptors } from './requestInterceptor';
import { getTools } from './toolExecutor';

export async function buildOpenAIRequest(
  model: ModelConfig,
  messages: OpenAIMessage[],
  toolFilter?: ToolFilter,
): Promise<{headers: Record<string, string>; body: Record<string, unknown>;}> {
  const config = loadAppConfig();
  const systemMessages = [{role: 'system', content: buildSystemPrompt(config.specialistMode)}];

  const request: Record<string, unknown> = {
    model: model.name,
    messages: [
      ...systemMessages,
      ...messages.filter(message => {
        if (message.role !== 'assistant') return true;
        if (message.tool_calls) return true;
        return Array.isArray(message.content)
          ? message.content.length > 0
          : Boolean(message.content);
      }).map(message => {
        return {
          role: message.role,
          content: message.content,
          ...(message.tool_calls && {tool_calls: message.tool_calls}),
          ...(message.tool_call_id && {tool_call_id: message.tool_call_id}),
          ...(message.reasoning_content && {reasoning_content: message.reasoning_content}),
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
