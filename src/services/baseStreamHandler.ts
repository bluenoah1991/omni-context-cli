import { ChatMessage } from '../types/session';
import { StreamCallbacks, ToolCall } from '../types/streamCallbacks';

export abstract class BaseStreamHandler {
  protected callbacks: StreamCallbacks;
  protected accumulatedContent = '';
  protected accumulatedThinking = '';
  protected accumulatedThinkingSignature = '';
  protected completedToolCalls: ToolCall[] = [];
  protected inputTokens = 0;
  protected outputTokens = 0;
  protected cachedTokens = 0;

  constructor(callbacks: StreamCallbacks) {
    this.callbacks = callbacks;
  }

  async stream(
    headers: Record<string, string>,
    body: Record<string, unknown>,
    endpoint: string,
    signal?: AbortSignal,
  ): Promise<ChatMessage> {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {...headers, 'Accept-Encoding': 'gzip, deflate, br'},
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = '';

    while (true) {
      const {done, value} = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, {stream: true});
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            this.processChunk({data, event: currentEvent || undefined});
          } catch (error) {
            throw error;
          }
        } else if (line === '') {
          currentEvent = '';
        }
      }
    }

    return this.finish();
  }

  protected abstract processChunk(chunk: any): void;

  protected abstract finish(): ChatMessage;
}
