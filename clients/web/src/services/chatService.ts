import type { IDEContext } from '../types/ide';
import type { RewindPoint } from '../types/rewind';
import type { Session } from '../types/session';
import type { SlashCommand } from '../types/slash';
import type { UIMessage } from '../types/uiMessage';
import { apiUrl } from '../utils/webSession';

interface ChatCallbacks {
  onMessage: (message: UIMessage) => void;
  onError: (error: string) => void;
  onDone: (session: Session) => void;
  onSessionUpdated?: (session: Session) => void;
  onCompacting?: () => void;
}

let cachedSlashCommands: SlashCommand[] | null = null;

export async function fetchIDEContext(): Promise<IDEContext | null> {
  const res = await fetch(apiUrl('ide/context'));
  if (res.status === 204) return null;
  return res.json();
}

export async function fetchSlashCommands(): Promise<SlashCommand[]> {
  if (cachedSlashCommands) {
    return cachedSlashCommands;
  }

  const response = await fetch(apiUrl('chat/slashCommands'));
  if (!response.ok) {
    return [];
  }

  cachedSlashCommands = await response.json();
  return cachedSlashCommands || [];
}

export async function sendChat(
  request: {content: string; images?: Array<{base64: string; mediaType: string;}>;},
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

  while (true) {
    const {done, value} = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, {stream: true});
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    let eventType = '';
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

export async function fetchRewindPoints(): Promise<RewindPoint[]> {
  const res = await fetch(apiUrl('chat/rewindPoints'));
  if (!res.ok) return [];
  return res.json();
}

export async function rewindSession(index: number): Promise<Session> {
  const res = await fetch(apiUrl('chat/rewind'), {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({index}),
  });
  return res.json();
}

export async function stopGeneration(): Promise<void> {
  await fetch(apiUrl('chat/stopGeneration'), {method: 'POST'});
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
  }
}
