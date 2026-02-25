import type { ApiResult } from '../types/api';
import type { IDEContext } from '../types/ide';
import type { RewindPoint } from '../types/rewind';
import type { Session } from '../types/session';
import type { SlashCommand } from '../types/slash';
import type { UIMessage } from '../types/uiMessage';
import { apiUrl } from '../utils/webSession';

export interface ToolApprovalRequest {
  id?: string;
  name: string;
  input: Record<string, unknown>;
}

interface ChatCallbacks {
  onMessage: (message: UIMessage) => void;
  onError: (error: string) => void;
  onDone: (session: Session) => void;
  onSessionUpdated?: (session: Session) => void;
  onCompacting?: () => void;
  onTokenUsage?: (
    usage: {inputTokens: number; outputTokens: number; cachedTokens: number;},
  ) => void;
  onToolApproval?: (request: ToolApprovalRequest) => void;
  onMedia?: (media: {url: string; mimeType: string;}) => void;
}

let cachedSlashCommands: SlashCommand[] | null = null;

export async function fetchIDEContext(): Promise<ApiResult<IDEContext | null>> {
  try {
    const res = await fetch(apiUrl('ide/context'));
    if (res.status === 204) return {data: null, error: null};
    return {data: await res.json(), error: null};
  } catch {
    return {data: null, error: 'Failed to fetch IDE context'};
  }
}

export async function fetchInputHistory(): Promise<ApiResult<string[]>> {
  try {
    const res = await fetch(apiUrl('chat/inputHistory'));
    if (!res.ok) return {data: [], error: null};
    return {data: await res.json(), error: null};
  } catch {
    return {data: null, error: 'Failed to fetch input history'};
  }
}

export async function addInputHistory(input: string): Promise<ApiResult<void>> {
  try {
    await fetch(apiUrl('chat/inputHistory'), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({input}),
    });
    return {data: undefined, error: null};
  } catch {
    return {data: null, error: 'Failed to add input history'};
  }
}

export async function fetchSlashCommands(): Promise<ApiResult<SlashCommand[]>> {
  if (cachedSlashCommands) {
    return {data: cachedSlashCommands, error: null};
  }

  try {
    const res = await fetch(apiUrl('chat/slashCommands'));
    if (!res.ok) return {data: [], error: null};
    cachedSlashCommands = await res.json();
    return {data: cachedSlashCommands || [], error: null};
  } catch {
    return {data: null, error: 'Failed to fetch slash commands'};
  }
}

export async function sendChat(
  request: {
    content: string;
    attachments?: Array<{base64: string; mediaType: string; fileName?: string;}>;
    pinnedIDEContexts?: IDEContext[];
  },
  callbacks: ChatCallbacks,
): Promise<void> {
  const res = await fetch(apiUrl('chat'), {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Request failed');
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('No response stream');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let eventType = '';

  while (true) {
    const {done, value} = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, {stream: true});
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7);
      } else if (line.startsWith('data: ') && eventType) {
        const data = JSON.parse(line.slice(6));
        handleEvent(eventType, data, callbacks);
        eventType = '';
      }
    }
  }
}

export async function fetchRewindPoints(): Promise<ApiResult<RewindPoint[]>> {
  try {
    const res = await fetch(apiUrl('chat/rewindPoints'));
    if (!res.ok) return {data: [], error: null};
    return {data: await res.json(), error: null};
  } catch {
    return {data: null, error: 'Failed to fetch rewind points'};
  }
}

export async function rewindSession(index: number): Promise<ApiResult<Session>> {
  try {
    const res = await fetch(apiUrl('chat/rewind'), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({index}),
    });
    return {data: await res.json(), error: null};
  } catch {
    return {data: null, error: 'Failed to rewind session'};
  }
}

export async function stopGeneration(): Promise<ApiResult<void>> {
  try {
    await fetch(apiUrl('chat/stopGeneration'), {method: 'POST'});
    return {data: undefined, error: null};
  } catch {
    return {data: null, error: 'Failed to stop generation'};
  }
}

export async function sendToolApproval(approved: boolean): Promise<ApiResult<void>> {
  try {
    await fetch(apiUrl('chat/toolApproval'), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({approved}),
    });
    return {data: undefined, error: null};
  } catch {
    return {data: null, error: 'Failed to send tool approval'};
  }
}

function handleEvent(event: string, data: unknown, callbacks: ChatCallbacks) {
  switch (event) {
    case 'compacting':
      callbacks.onCompacting?.();
      break;
    case 'done':
      callbacks.onDone(data as Session);
      break;
    case 'error': {
      const error = (data as {error?: string;}).error;
      if (error) callbacks.onError(error);
      break;
    }
    case 'message':
      callbacks.onMessage(data as UIMessage);
      break;
    case 'session_updated':
      callbacks.onSessionUpdated?.(data as Session);
      break;
    case 'usage':
      callbacks.onTokenUsage?.(
        data as {inputTokens: number; outputTokens: number; cachedTokens: number;},
      );
      break;
    case 'tool_approval':
      callbacks.onToolApproval?.(data as ToolApprovalRequest);
      break;
    case 'media':
      callbacks.onMedia?.(data as {url: string; mimeType: string;});
      break;
  }
}
