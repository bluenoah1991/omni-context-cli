import { buildSystemPrompt } from '../prompts/systemPromptBuilder.js';
import { ModelConfig } from '../types/config';
import {
  ResponsesContentItem,
  ResponsesFunctionCallOutput,
  ResponsesMessage,
  ResponsesMessageItem,
} from '../types/responsesMessage';
import { ChatMessage } from '../types/session';
import { ToolFilter } from '../types/tool';
import { editResponsesContext } from '../utils/contextEditor';
import { unwrapPromptMessage } from '../utils/messagePreprocessor';
import { loadAppConfig } from './configManager';
import { applyInterceptors } from './requestInterceptor';
import { getTools } from './toolExecutor';

export async function buildResponsesRequest(
  model: ModelConfig,
  messages: ChatMessage[],
  toolFilter?: ToolFilter,
  skipSystemPrompt?: boolean,
  sessionId?: string,
  isFromAgent?: boolean,
): Promise<{headers: Record<string, string>; body: Record<string, unknown>;}> {
  const config = loadAppConfig();

  const editedMessages = editResponsesContext(messages);

  const input: ResponsesContentItem[] = [];
  for (const chatMessage of editedMessages) {
    if ('type' in chatMessage && chatMessage.type === 'responses') {
      const wrapper = chatMessage as ResponsesMessage;
      for (const item of wrapper.items) {
        if (item.type === 'message') {
          const message = item as ResponsesMessageItem;
          if (typeof message.content === 'string') {
            input.push({...message, content: unwrapPromptMessage(message.content)});
          } else if (Array.isArray(message.content)) {
            input.push({
              ...message,
              content: message.content.map(part =>
                'text' in part ? {...part, text: unwrapPromptMessage(part.text)} : part
              ),
            });
          } else {
            input.push(item);
          }
        } else if (item.type === 'function_call_output') {
          const funcOutput = item as ResponsesFunctionCallOutput;
          if (typeof funcOutput.output === 'string') {
            try {
              const {displayText, ...rest} = JSON.parse(funcOutput.output);
              input.push({...funcOutput, output: JSON.stringify(rest)});
            } catch {
              input.push(item);
            }
          } else if (Array.isArray(funcOutput.output)) {
            const output = funcOutput.output.map(part => {
              if (part.type === 'input_text') {
                try {
                  const {displayText, ...rest} = JSON.parse(part.text);
                  return {...part, text: JSON.stringify(rest)};
                } catch {
                  return part;
                }
              }
              return part;
            });
            input.push({...funcOutput, output});
          } else {
            input.push(item);
          }
        } else {
          input.push(item);
        }
      }
    }
  }

  const request: Record<string, unknown> = {
    model: model.name,
    input,
    stream: true,
    store: false,
    include: ['reasoning.encrypted_content'],
  };

  if (sessionId) {
    request.prompt_cache_key = sessionId;
  }

  if (!skipSystemPrompt) {
    const instructions = buildSystemPrompt(config.specialistMode, isFromAgent);
    if (instructions && instructions.trim()) {
      request.instructions = instructions;
    }
  }

  if (config.enableThinking) {
    request.reasoning = {effort: 'high', summary: 'auto'};
  }

  const tools = await getTools(toolFilter);

  if (tools.length) {
    request.tools = tools.map(tool => ({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: {type: 'object', ...tool.parameters},
      strict: false,
    }));
    request.tool_choice = 'auto';
    request.parallel_tool_calls = true;
  }

  const body = applyInterceptors(request, model);

  const headers = {'Content-Type': 'application/json', Authorization: `Bearer ${model.apiKey}`};

  return {headers, body};
}
