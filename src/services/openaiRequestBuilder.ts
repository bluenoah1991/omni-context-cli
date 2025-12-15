import systemPrompt from '../prompts/system.txt';
import { AppConfig } from '../types/config';
import { OpenAIMessage } from '../types/openaiMessage';
import { applyInterceptors } from './requestInterceptor';
import { getTools } from './toolExecutor';

export async function buildOpenAIRequest(
  config: AppConfig,
  messages: OpenAIMessage[],
): Promise<{headers: Record<string, string>; body: Record<string, unknown>;}> {
  const systemMessages = [{role: 'system', content: systemPrompt}];

  const request: Record<string, unknown> = {
    model: config.model,
    messages: [
      ...systemMessages,
      ...messages.filter(message => {
        return message.role !== 'assistant' || message.content || message.tool_calls;
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
  };

  if (config.enableThinking) {
    request.reasoning_effort = 'high';
  }

  const tools = await getTools();
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

  const body = applyInterceptors(request, config);

  const headers = {'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}`};

  return {headers, body};
}
