import { buildSystemPrompt } from '../prompts/systemPromptBuilder.js';
import { ModelConfig } from '../types/config';
import { GeminiMessage, GeminiPart } from '../types/geminiMessage';
import { ToolFilter } from '../types/tool';
import { editGeminiContext } from '../utils/contextEditor';
import { unwrapPromptMessage } from '../utils/messagePreprocessor';
import { loadAppConfig } from './configManager';
import { applyInterceptors } from './requestInterceptor';
import { getTools } from './toolExecutor';

export async function buildGeminiRequest(
  model: ModelConfig,
  messages: GeminiMessage[],
  toolFilter?: ToolFilter,
  skipSystemPrompt?: boolean,
  isFromAgent?: boolean,
): Promise<{headers: Record<string, string>; body: Record<string, unknown>;}> {
  const config = loadAppConfig();

  const editedMessages = editGeminiContext(messages);

  const preprocessedMessages = editedMessages.filter(message => {
    return message.parts && message.parts.length > 0;
  }).map(message => {
    const parts: GeminiPart[] = message.parts.map(part => {
      if (part.text !== undefined && message.role === 'user') {
        return {...part, text: unwrapPromptMessage(part.text)};
      }
      if (part.functionCall) {
        return {...part, functionCall: {...part.functionCall}};
      }
      if (part.functionResponse) {
        const {displayText, diffs, ...rest} = part.functionResponse.response as any;
        return {...part, functionResponse: {...part.functionResponse, response: rest}};
      }
      if (part.inlineData) {
        const {fileName, ...rest} = part.inlineData;
        return {...part, inlineData: rest};
      }
      return {...part};
    });
    return {role: message.role, parts};
  });

  const request: Record<string, unknown> = {contents: preprocessedMessages};

  if (!skipSystemPrompt) {
    request.systemInstruction = {
      parts: [{text: buildSystemPrompt(config.workflowPreset, isFromAgent)}],
    };
  }

  const generationConfig: Record<string, unknown> = {};

  if (config.enableThinking) {
    generationConfig.thinkingConfig = {thinkingBudget: 24576, includeThoughts: true};
  }

  if (Object.keys(generationConfig).length > 0) {
    request.generationConfig = generationConfig;
  }

  const tools = await getTools(toolFilter);

  if (tools.length) {
    request.tools = [{
      functionDeclarations: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: {type: 'object', ...tool.parameters},
      })),
    }];
  }

  const body = applyInterceptors(request, model);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-goog-api-key': model.apiKey,
  };

  return {headers, body};
}
