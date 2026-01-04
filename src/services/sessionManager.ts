import fs from 'node:fs';
import path from 'node:path';
import { AnthropicContentBlock, AnthropicMessage } from '../types/anthropicMessage';
import { Provider } from '../types/config';
import { ModelConfig } from '../types/config';
import { OpenAIMessage } from '../types/openaiMessage';
import { ChatMessage, RewindPoint, Session } from '../types/session';
import { ToolCall } from '../types/streamCallbacks';
import { removeIDEContext, unwrapUIMessage } from '../utils/messagePreprocessor';
import { ensureProjectDir, getProjectDir } from '../utils/omxPaths';
import { getCurrentModel } from './configManager';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

export function createSession(preferredModel?: ModelConfig): Session {
  const now = Date.now();
  return {
    id: generateId(),
    title: 'New Chat',
    messages: [],
    createdAt: now,
    updatedAt: now,
    modelId: (preferredModel ?? getCurrentModel())?.id,
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
  };
}

export function addUserMessage(session: Session, content: string, provider: Provider): Session {
  let message: ChatMessage;

  if (provider === 'openai') {
    message = {role: 'user', content} as OpenAIMessage;
  } else {
    const contentBlocks: AnthropicContentBlock[] = [];
    if (content) contentBlocks.push({type: 'text', text: content});
    message = {role: 'user', content: contentBlocks} as AnthropicMessage;
  }

  const isFirstMessage = session.messages.length === 0;
  const title = isFirstMessage ? normalizeMessageContent(content) : session.title;
  return {
    ...session,
    title,
    messages: [...session.messages, message],
    updatedAt: Date.now(),
    modelId: getCurrentModel()?.id,
  };
}

export function addAssistantMessage(
  session: Session,
  content: string,
  provider: Provider,
): Session {
  const message: ChatMessage = provider === 'openai'
    ? ({role: 'assistant', content} as OpenAIMessage)
    : ({role: 'assistant', content: [{type: 'text', text: content}]} as AnthropicMessage);
  return {...session, messages: [...session.messages, message], updatedAt: Date.now()};
}

export function getLastAssistantToolCalls(session: Session, provider: Provider): ToolCall[] {
  const lastMessage = session.messages[session.messages.length - 1];
  if (lastMessage.role !== 'assistant') return [];

  if (provider === 'openai') {
    const openaiMessage = lastMessage as OpenAIMessage;
    if (!openaiMessage.tool_calls || openaiMessage.tool_calls.length === 0) return [];
    return openaiMessage.tool_calls.map(tc => ({
      id: tc.id,
      name: tc.function.name,
      input: JSON.parse(tc.function.arguments),
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
  toolResults: Array<{toolCallId: string; content: string;}>,
  provider: Provider,
): Session {
  let toolResultMessages: ChatMessage[];

  if (provider === 'openai') {
    toolResultMessages = toolResults.map(
      result => ({
        role: 'tool',
        content: result.content,
        tool_call_id: result.toolCallId,
      } as OpenAIMessage)
    );
  } else {
    toolResultMessages = [
      {
        role: 'user',
        content: toolResults.map(result => ({
          type: 'tool_result' as const,
          tool_use_id: result.toolCallId,
          content: result.content,
        })),
      } as AnthropicMessage,
    ];
  }

  return {
    ...session,
    messages: [...session.messages, ...toolResultMessages],
    updatedAt: Date.now(),
  };
}

export function saveSession(session: Session, provider: Provider): void {
  ensureProjectDir();
  const filepath = path.join(getProjectDir(), `${provider}-${session.createdAt}.json`);
  fs.writeFileSync(filepath, JSON.stringify(session, null, 2));
}

export function listSessions(
  provider: Provider,
  limit = 10,
): Array<{path: string; title: string; createdAt: number;}> {
  const dir = getProjectDir();
  if (!fs.existsSync(dir)) return [];

  const prefix = `${provider}-`;
  return fs.readdirSync(dir).filter(f => f.startsWith(prefix) && f.endsWith('.json')).sort((a, b) =>
    parseInt(b.slice(prefix.length, -5)) - parseInt(a.slice(prefix.length, -5))
  ).slice(0, limit).map(f => {
    const filepath = path.join(dir, f);
    const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    return {path: filepath, title: content.title, createdAt: content.createdAt};
  });
}

export function loadSession(filepath: string): Session {
  const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  return {
    id: content.id,
    title: content.title,
    messages: content.messages,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt,
    modelId: content.modelId,
    inputTokens: content.inputTokens ?? 0,
    outputTokens: content.outputTokens ?? 0,
    cachedTokens: content.cachedTokens ?? 0,
  };
}

export function loadLatestSession(): Session | null {
  const dir = getProjectDir();
  if (!fs.existsSync(dir)) return null;

  const allFiles = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => {
    const filepath = path.join(dir, f);
    const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    return {path: filepath, updatedAt: content.updatedAt};
  }).sort((a, b) => b.updatedAt - a.updatedAt);

  if (allFiles.length === 0) return null;
  return loadSession(allFiles[0].path);
}

export function getRewindPoints(session: Session): RewindPoint[] {
  const points: RewindPoint[] = [];
  let isFirstUserMessage = true;
  session.messages.forEach((msg, index) => {
    if (msg.role !== 'user') return;

    const openaiMsg = msg as OpenAIMessage;
    if (openaiMsg.tool_call_id) return;

    let text = '';
    if (typeof msg.content === 'string') {
      text = msg.content;
    } else if (Array.isArray(msg.content)) {
      const anthropicContent = msg.content as AnthropicContentBlock[];
      const hasToolResult = anthropicContent.some(block => block.type === 'tool_result');
      if (hasToolResult) return;

      const textBlock = anthropicContent.find(block => block.type === 'text');
      if (textBlock && textBlock.type === 'text') {
        text = textBlock.text;
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
