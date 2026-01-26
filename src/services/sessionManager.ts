import fs from 'node:fs';
import path from 'node:path';
import { AnthropicContentBlock, AnthropicMessage } from '../types/anthropicMessage';
import { ModelConfig, Provider } from '../types/config';
import { GeminiMessage } from '../types/geminiMessage';
import { OpenAIContentPart, OpenAIMessage } from '../types/openaiMessage';
import {
  ResponsesContentItem,
  ResponsesFunctionCall,
  ResponsesInputImage,
  ResponsesInputText,
  ResponsesMessage,
  ResponsesMessageItem,
} from '../types/responsesMessage';
import {
  ChatMessage,
  RewindPoint,
  Session,
  SessionIndex,
  SessionIndexEntry,
} from '../types/session';

import { ToolCall, ToolResult } from '../types/streamCallbacks';
import { parseDataUrl } from '../utils/mediaUtils';
import { removeIDEContext, unwrapUIMessage } from '../utils/messagePreprocessor';
import { ensureProjectDir, getProjectDir } from '../utils/omxPaths';
import { getCurrentModel } from './configManager';

const INDEX_LIMIT = 10;

function getIndexPath(): string {
  return path.join(getProjectDir(), 'index.json');
}

function loadIndex(): SessionIndex {
  const indexPath = getIndexPath();
  if (!fs.existsSync(indexPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  } catch {
    return [];
  }
}

function saveIndex(index: SessionIndex): void {
  ensureProjectDir();
  fs.writeFileSync(getIndexPath(), JSON.stringify(index));
}

function updateIndex(session: Session, filepath: string): void {
  let index = loadIndex().filter(e => e.id !== session.id);
  index.unshift({
    id: session.id,
    path: filepath,
    title: session.title,
    provider: session.provider,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  });
  index = index.slice(0, INDEX_LIMIT);
  saveIndex(index);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function normalizeMessageContent(text: string, maxLength = 50): string {
  let normalized = unwrapUIMessage(text);
  normalized = removeIDEContext(normalized);
  normalized = normalized.replace(/\s+/g, ' ').trim();
  if (normalized.length > maxLength) {
    normalized = normalized.substring(0, maxLength) + '...';
  }
  return normalized;
}

export function createSession(model?: ModelConfig): Session {
  const now = Date.now();
  return {
    id: generateId(),
    title: 'New Chat',
    provider: model?.provider ?? 'none',
    messages: [],
    createdAt: now,
    updatedAt: now,
    modelId: model?.id,
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
  };
}

export interface UserMessageMedia {
  dataUrl: string;
  mimeType: string;
}

export function addUserMessage(
  session: Session,
  content: string,
  provider: Provider,
  media?: UserMessageMedia[],
): Session {
  let message: ChatMessage;

  if (provider === 'responses') {
    const contentItems: (ResponsesInputText | ResponsesInputImage)[] = [{
      type: 'input_text',
      text: content,
    }];
    if (media) {
      for (const item of media) {
        contentItems.push({type: 'input_image', image_url: item.dataUrl, detail: 'auto'});
      }
    }
    const responsesMessage: ResponsesMessageItem = {
      type: 'message',
      role: 'user',
      content: contentItems,
    };
    message = {
      type: 'responses',
      role: 'user',
      items: [responsesMessage],
      content,
    } as ResponsesMessage;
  } else if (provider === 'openai') {
    if (media && media.length > 0) {
      const parts: OpenAIContentPart[] = [{type: 'text', text: content}];
      for (const item of media) {
        parts.push({type: 'image_url', image_url: {url: item.dataUrl}});
      }
      message = {role: 'user', content: parts} as OpenAIMessage;
    } else {
      message = {role: 'user', content} as OpenAIMessage;
    }
  } else if (provider === 'gemini') {
    const parts: GeminiMessage['parts'] = [{text: content}];
    if (media) {
      for (const item of media) {
        const parsed = parseDataUrl(item.dataUrl);
        if (parsed) {
          parts.push({inlineData: {mimeType: parsed.mediaType, data: parsed.data}});
        }
      }
    }
    message = {role: 'user', parts} as GeminiMessage;
  } else {
    const contentBlocks: AnthropicContentBlock[] = [{type: 'text', text: content}];
    if (media) {
      for (const item of media) {
        const parsed = parseDataUrl(item.dataUrl);
        if (parsed) {
          contentBlocks.push({
            type: 'image',
            source: {type: 'base64', media_type: parsed.mediaType, data: parsed.data},
          });
        }
      }
    }
    message = {role: 'user', content: contentBlocks} as AnthropicMessage;
  }

  const title = normalizeMessageContent(content);
  return {
    ...session,
    title,
    provider,
    messages: [...session.messages, message],
    updatedAt: Date.now(),
    modelId: getCurrentModel()?.id,
  };
}

export function getLastAssistantToolCalls(session: Session, provider: Provider): ToolCall[] {
  if (provider === 'responses') {
    const toolCalls: ToolCall[] = [];
    const lastMessage = session.messages[session.messages.length - 1];

    if (!lastMessage || !('type' in lastMessage)) return [];

    let items: ResponsesContentItem[] = [];

    if (lastMessage.type === 'responses') {
      items = (lastMessage as ResponsesMessage).items;
    } else {
      return [];
    }

    for (const item of items) {
      if (item.type === 'function_call') {
        const functionCall = item as ResponsesFunctionCall;
        let input: any = {};
        try {
          input = JSON.parse(functionCall.arguments);
        } catch {}
        toolCalls.push({id: functionCall.call_id, name: functionCall.name, input});
      }
    }
    return toolCalls;
  }

  const lastMessage = session.messages[session.messages.length - 1];
  if (lastMessage.role !== 'assistant' && lastMessage.role !== 'model') return [];

  if (provider === 'openai') {
    const openaiMessage = lastMessage as OpenAIMessage;
    if (!openaiMessage.tool_calls || openaiMessage.tool_calls.length === 0) return [];
    return openaiMessage.tool_calls.map(tc => ({
      id: tc.id,
      name: tc.function.name,
      input: JSON.parse(tc.function.arguments),
    }));
  }

  if (provider === 'gemini') {
    const geminiMessage = lastMessage as GeminiMessage;
    return geminiMessage.parts.filter(part => part.functionCall).map(part => ({
      id: part.functionCall!.id,
      name: part.functionCall!.name,
      input: part.functionCall!.args,
    }));
  }

  const anthropicMessage = lastMessage as AnthropicMessage;
  if (typeof anthropicMessage.content === 'string') return [];
  return anthropicMessage.content.filter(block => block.type === 'tool_use').map((block: any) => ({
    id: block.id,
    name: block.name,
    input: block.input,
  }));
}

export function addToolResultMessages(
  session: Session,
  toolResults: ToolResult[],
  provider: Provider,
): Session {
  let toolResultMessages: ChatMessage[];

  if (provider === 'responses') {
    toolResultMessages = toolResults.map(result => {
      const output: string | (ResponsesInputText | ResponsesInputImage)[] = result.dataUrl
        ? [{type: 'input_text', text: result.content}, {
          type: 'input_image',
          image_url: result.dataUrl,
          detail: 'auto',
        }]
        : result.content;
      return {
        type: 'responses',
        role: 'user',
        items: [{type: 'function_call_output', call_id: result.id!, output}],
        content: result.content,
      } as ResponsesMessage;
    });
  } else if (provider === 'openai') {
    toolResultMessages = toolResults.map(result => {
      if (result.dataUrl) {
        const parts: OpenAIContentPart[] = [{type: 'text', text: result.content}, {
          type: 'image_url',
          image_url: {url: result.dataUrl},
        }];
        return {role: 'tool', content: parts, tool_call_id: result.id} as OpenAIMessage;
      }
      return {role: 'tool', content: result.content, tool_call_id: result.id} as OpenAIMessage;
    });
  } else if (provider === 'gemini') {
    toolResultMessages = [{
      role: 'user',
      parts: toolResults.map(result => {
        let response: Record<string, unknown>;
        try {
          response = JSON.parse(result.content);
        } catch {
          response = {output: result.content};
        }
        if (result.dataUrl) {
          const parsed = parseDataUrl(result.dataUrl);
          if (parsed) {
            return {
              functionResponse: {
                id: result.id,
                name: result.name,
                response,
                parts: [{inlineData: {mimeType: parsed.mediaType, data: parsed.data}}],
              },
            };
          }
        }
        return {functionResponse: {id: result.id, name: result.name, response}};
      }),
    } as GeminiMessage];
  } else {
    toolResultMessages = [{
      role: 'user',
      content: toolResults.map(result => {
        if (result.dataUrl) {
          const parsed = parseDataUrl(result.dataUrl);
          if (parsed) {
            return {
              type: 'tool_result' as const,
              tool_use_id: result.id,
              content: [{type: 'text', text: result.content}, {
                type: 'image',
                source: {type: 'base64', media_type: parsed.mediaType, data: parsed.data},
              }],
            };
          }
        }
        return {type: 'tool_result' as const, tool_use_id: result.id, content: result.content};
      }),
    } as AnthropicMessage];
  }

  return {
    ...session,
    messages: [...session.messages, ...toolResultMessages],
    updatedAt: Date.now(),
  };
}

export function saveSession(session: Session): void {
  ensureProjectDir();
  const filepath = path.join(getProjectDir(), `${session.provider}-${session.createdAt}.json`);
  fs.writeFileSync(filepath, JSON.stringify(session, null, 2));
  updateIndex(session, filepath);
}

export function listSessions(provider: Provider, limit = 10): SessionIndexEntry[] {
  const index = loadIndex();
  return index.filter(e => e.provider === provider).slice(0, limit);
}

export function loadSession(filepath: string): Session {
  const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  return {
    id: content.id,
    title: content.title,
    provider: content.provider,
    messages: content.messages,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt,
    modelId: content.modelId,
    inputTokens: content.inputTokens ?? 0,
    outputTokens: content.outputTokens ?? 0,
    cachedTokens: content.cachedTokens ?? 0,
  };
}

export function loadSessionById(sessionId: string): Session | null {
  const index = loadIndex();
  const entry = index.find(e => e.id === sessionId);
  if (!entry) return null;
  return loadSession(entry.path);
}

export function loadLatestSession(): Session | null {
  const index = loadIndex();

  if (index.length > 0) {
    const latest = index[0];
    if (fs.existsSync(latest.path)) {
      return loadSession(latest.path);
    }
  }

  const dir = getProjectDir();
  if (!fs.existsSync(dir)) return null;

  const allFiles = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'index.json').map(
    f => {
      const filepath = path.join(dir, f);
      const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      return {path: filepath, updatedAt: content.updatedAt};
    },
  ).sort((a, b) => b.updatedAt - a.updatedAt);

  if (allFiles.length === 0) return null;
  return loadSession(allFiles[0].path);
}

export function getRewindPoints(session: Session): RewindPoint[] {
  const points: RewindPoint[] = [];
  let isFirstUserMessage = true;
  session.messages.forEach((message, index) => {
    if (message.role !== 'user') return;

    const openaiMessage = message as OpenAIMessage;
    if (openaiMessage.tool_call_id) return;

    let text = '';
    if ('content' in message) {
      if (typeof message.content === 'string') {
        text = message.content;
      } else if (Array.isArray(message.content)) {
        const anthropicContent = message.content as AnthropicContentBlock[];
        const hasToolResult = anthropicContent.some(block => block.type === 'tool_result');
        if (hasToolResult) return;

        const textBlock = anthropicContent.find(block => block.type === 'text');
        if (textBlock && textBlock.type === 'text') {
          text = textBlock.text;
        }
      }
    } else if ('parts' in message) {
      const geminiMessage = message as GeminiMessage;
      const hasFunctionResponse = geminiMessage.parts.some(part => part.functionResponse);
      if (hasFunctionResponse) return;

      const textPart = geminiMessage.parts.find(part => part.text !== undefined && !part.thought);
      if (textPart) {
        text = textPart.text || '';
      }
    }

    if (text) {
      if (isFirstUserMessage) {
        isFirstUserMessage = false;
        return;
      }
      points.push({index, label: normalizeMessageContent(text)});
    }
  });
  return points.reverse();
}

export function truncateSession(session: Session, messageIndex: number): Session {
  const now = Date.now();
  return {
    ...session,
    id: generateId(),
    messages: session.messages.slice(0, messageIndex),
    createdAt: now,
    updatedAt: now,
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
  };
}
