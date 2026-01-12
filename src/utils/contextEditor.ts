import { loadAppConfig } from '../services/configManager.js';
import type { AnthropicContentBlock, AnthropicMessage } from '../types/anthropicMessage.js';
import type { GeminiMessage, GeminiPart } from '../types/geminiMessage.js';
import type { OpenAIMessage } from '../types/openaiMessage.js';
import type {
  ResponsesContentItem,
  ResponsesFunctionCall,
  ResponsesFunctionCallOutput,
  ResponsesMessage,
} from '../types/responsesMessage.js';
import type { ChatMessage } from '../types/session.js';

const COMPRESSED = '[compressed]';
const COMPRESSED_JSON = '{"compressed":true}';

function hasAnthropicToolResult(message: AnthropicMessage): boolean {
  if (!Array.isArray(message.content)) return false;
  return message.content.some(block => block.type === 'tool_result');
}

function getAnthropicRoundBoundary(messages: AnthropicMessage[], rounds: number): number {
  if (rounds <= 0) return 0;
  let count = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user' && !hasAnthropicToolResult(messages[i])) {
      count++;
      if (count >= rounds) return i;
    }
  }
  return 0;
}

export function editAnthropicContext(messages: AnthropicMessage[]): AnthropicMessage[] {
  const config = loadAppConfig();
  if (!config.contextEditing) return messages;

  const compressBoundary = getAnthropicRoundBoundary(messages, config.contextEditingRounds);
  const thinkingBoundary = getAnthropicRoundBoundary(messages, 1);

  return messages.map((message, index) => {
    const compressTool = index < compressBoundary;
    const removeThinking = index < thinkingBoundary;
    if (!compressTool && !removeThinking) return message;
    if (!Array.isArray(message.content)) return message;

    const content: AnthropicContentBlock[] = [];
    for (const block of message.content) {
      if (block.type === 'thinking') {
        if (!removeThinking) content.push(block);
        continue;
      }
      if (block.type === 'tool_use') {
        content.push(compressTool ? {...block, input: {compressed: true}} : block);
        continue;
      }
      if (block.type === 'tool_result') {
        content.push(compressTool ? {...block, content: COMPRESSED} : block);
        continue;
      }
      content.push(block);
    }
    return {role: message.role, content};
  });
}

function getOpenAIRoundBoundary(messages: OpenAIMessage[], rounds: number): number {
  if (rounds <= 0) return 0;
  let count = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      count++;
      if (count >= rounds) return i;
    }
  }
  return 0;
}

export function editOpenAIContext(messages: OpenAIMessage[]): OpenAIMessage[] {
  const config = loadAppConfig();
  if (!config.contextEditing) return messages;

  const compressBoundary = getOpenAIRoundBoundary(messages, config.contextEditingRounds);
  const thinkingBoundary = getOpenAIRoundBoundary(messages, 1);

  return messages.map((message, index) => {
    const compressTool = index < compressBoundary;
    const removeThinking = index < thinkingBoundary;
    if (!compressTool && !removeThinking) return message;

    const result: OpenAIMessage = {role: message.role};
    if (message.content !== undefined) {
      result.content = (message.role === 'tool' && compressTool) ? COMPRESSED : message.content;
    }
    if (message.tool_calls) {
      result.tool_calls = compressTool
        ? message.tool_calls.map(toolCall => ({
          ...toolCall,
          function: {...toolCall.function, arguments: COMPRESSED_JSON},
        }))
        : message.tool_calls;
    }
    if (message.tool_call_id) result.tool_call_id = message.tool_call_id;
    if (!removeThinking) {
      if (message.reasoning) result.reasoning = message.reasoning;
      if (message.reasoning_content) result.reasoning_content = message.reasoning_content;
      if (message.reasoning_details) result.reasoning_details = message.reasoning_details;
    }
    return result;
  });
}

function hasGeminiFunctionResponse(message: GeminiMessage): boolean {
  return message.parts.some(part => part.functionResponse !== undefined);
}

function getGeminiRoundBoundary(messages: GeminiMessage[], rounds: number): number {
  if (rounds <= 0) return 0;
  let count = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user' && !hasGeminiFunctionResponse(messages[i])) {
      count++;
      if (count >= rounds) return i;
    }
  }
  return 0;
}

export function editGeminiContext(messages: GeminiMessage[]): GeminiMessage[] {
  const config = loadAppConfig();
  if (!config.contextEditing) return messages;

  const compressBoundary = getGeminiRoundBoundary(messages, config.contextEditingRounds);
  const thinkingBoundary = getGeminiRoundBoundary(messages, 1);

  return messages.map((message, index) => {
    const compressTool = index < compressBoundary;
    const removeThinking = index < thinkingBoundary;
    if (!compressTool && !removeThinking) return message;

    const parts: GeminiPart[] = [];
    for (const part of message.parts) {
      if (part.thought) {
        if (!removeThinking) parts.push(part);
        continue;
      }
      if (part.functionCall) {
        parts.push(
          compressTool
            ? {functionCall: {name: part.functionCall.name, args: {compressed: true}}}
            : part,
        );
        continue;
      }
      if (part.functionResponse) {
        parts.push(
          compressTool
            ? {functionResponse: {name: part.functionResponse.name, response: {compressed: true}}}
            : part,
        );
        continue;
      }
      parts.push(part);
    }
    return {role: message.role, parts};
  });
}

function hasResponsesToolOutput(message: ResponsesMessage): boolean {
  return message.items.some(item => item.type === 'function_call_output');
}

function getResponsesRoundBoundary(messages: ChatMessage[], rounds: number): number {
  if (rounds <= 0) return 0;
  let count = 0;
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if ('type' in message && message.type === 'responses') {
      const responsesMessage = message as ResponsesMessage;
      if (responsesMessage.role === 'user' && !hasResponsesToolOutput(responsesMessage)) {
        count++;
        if (count >= rounds) return index;
      }
    }
  }
  return 0;
}

export function editResponsesContext(messages: ChatMessage[]): ChatMessage[] {
  const config = loadAppConfig();
  if (!config.contextEditing) return messages;

  const compressBoundary = getResponsesRoundBoundary(messages, config.contextEditingRounds);
  const thinkingBoundary = getResponsesRoundBoundary(messages, 1);

  return messages.map((chatMessage, index) => {
    if (!('type' in chatMessage) || chatMessage.type !== 'responses') return chatMessage;

    const responsesMessage = chatMessage as ResponsesMessage;
    const compressTool = index < compressBoundary;
    const removeThinking = index < thinkingBoundary;
    if (!compressTool && !removeThinking) return chatMessage;

    const items: ResponsesContentItem[] = [];
    for (const item of responsesMessage.items) {
      if (item.type === 'reasoning') {
        if (!removeThinking) items.push(item);
        continue;
      }
      if (item.type === 'function_call') {
        const functionCall = item as ResponsesFunctionCall;
        items.push(compressTool ? {...functionCall, arguments: COMPRESSED_JSON} : item);
        continue;
      }
      if (item.type === 'function_call_output') {
        const functionCallOutput = item as ResponsesFunctionCallOutput;
        items.push(compressTool ? {...functionCallOutput, output: COMPRESSED} : item);
        continue;
      }
      items.push(item);
    }
    return {...responsesMessage, items} as ChatMessage;
  });
}
