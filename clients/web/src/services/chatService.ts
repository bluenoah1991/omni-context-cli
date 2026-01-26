import type { IDEContext } from '../types/ide';
import type { Session } from '../types/session';
import type { UIMessage } from '../types/uiMessage';
import { apiUrl } from '../utils/webSession';

interface ChatCallbacks {
  onMessage: (message: UIMessage) => void;
  onError: (error: string) => void;
  onDone: (session: Session) => void;
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

function handleEvent(event: string, data: unknown, callbacks: ChatCallbacks) {
  switch (event) {
    case 'message':
      callbacks.onMessage(data as UIMessage);
      break;
    case 'error': {
      const error = (data as {error?: string;}).error;
      if (error) callbacks.onError(error);
      break;
    }
    case 'done':
      callbacks.onDone(data as Session);
      break;
  }
}

export async function stopGeneration(): Promise<void> {
  await fetch(apiUrl('chat/stopGeneration'), {method: 'POST'});
}

export async function fetchIDEContext(): Promise<IDEContext | null> {
  const res = await fetch(apiUrl('ide/context'));
  if (res.status === 204) return null;
  return res.json();
}
