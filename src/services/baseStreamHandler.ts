import { ModelConfig } from '../types/config';
import { ChatMessage } from '../types/session';
import { StreamCallbacks, StreamResult, ToolCall } from '../types/streamCallbacks';

export abstract class BaseStreamHandler {
  protected callbacks: StreamCallbacks;
  protected accumulatedContent = '';
  protected accumulatedThinking = '';
  protected accumulatedThinkingSignature = '';
  protected completedToolCalls: ToolCall[] = [];
  protected inputTokens = 0;
  protected outputTokens = 0;
  protected cacheCreationTokens = 0;
  protected cacheReadTokens = 0;

  constructor(callbacks: StreamCallbacks) {
    this.callbacks = callbacks;
  }

  protected getEndpoint(model: ModelConfig): string {
    return model.apiUrl;
  }

  async stream(
    headers: Record<string, string>,
    body: Record<string, unknown>,
    model: ModelConfig,
    signal?: AbortSignal,
  ): Promise<StreamResult<ChatMessage>> {
    const endpoint = this.getEndpoint(model);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {...headers, 'Accept-Encoding': 'gzip, deflate, br'},
      body: JSON.stringify(body),
      signal,
      credentials: 'omit',
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

    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, {stream: true});
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            const data = line.slice(5).trimStart();
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
    } finally {
      reader.releaseLock();
    }
  }

  protected abstract processChunk(chunk: any): void;

  protected abstract finish(): StreamResult<ChatMessage>;
}
