import { ChatMessage } from '../types/session';
import { StreamResult, ToolCall } from '../types/streamCallbacks';
import { BaseStreamHandler } from './baseStreamHandler';

interface ToolCallAccumulator {
  id?: string;
  name: string;
  arguments: string;
}

export class OpenAIStreamHandler extends BaseStreamHandler {
  private activeToolCalls = new Map<number, ToolCallAccumulator>();

  protected processChunk(chunk: any): void {
    if (chunk.data === '[DONE]') {
      return;
    }

    const data = JSON.parse(chunk.data);

    if (data.error) {
      const errorMessage = data.error.message || JSON.stringify(data.error);
      throw new Error(errorMessage);
    }

    if (data.usage) {
      this.inputTokens = data.usage.prompt_tokens || 0;
      this.outputTokens = data.usage.completion_tokens || 0;
      if (data.usage.prompt_tokens_details?.cached_tokens) {
        this.cacheReadTokens = data.usage.prompt_tokens_details.cached_tokens;
      }
    }

    const choice = data.choices?.[0];
    const delta = choice?.delta;

    if (!delta) return;

    if (delta.content) {
      this.accumulatedContent += delta.content;

      if (this.accumulatedContent.trim()) {
        this.callbacks.onContent(delta.content);
      }
    }

    const thinking = this.extractThinking(delta);
    if (thinking) {
      this.accumulatedThinking += thinking;

      if (this.accumulatedThinking.trim()) {
        this.callbacks.onThinking(thinking);
      }
    }

    if (delta.tool_calls) {
      delta.tool_calls.forEach((tc: any) => this.handleToolCallDelta(tc));
    }
  }

  private extractThinking(delta: any): string {
    if (delta.reasoning) {
      return delta.reasoning;
    }

    if (delta.reasoning_content) {
      return delta.reasoning_content;
    }

    if (delta.reasoning_details) {
      if (Array.isArray(delta.reasoning_details)) {
        return delta.reasoning_details.map((item: any) => item.text || item.content || '').join(
          '\n',
        );
      }

      return String(delta.reasoning_details);
    }

    return '';
  }

  private handleToolCallDelta(delta: any): void {
    const index = delta.index || 0;

    if (!this.activeToolCalls.has(index)) {
      this.activeToolCalls.set(index, {id: delta.id, name: '', arguments: ''});
    }

    const toolCall = this.activeToolCalls.get(index)!;

    if (delta.id) {
      toolCall.id = delta.id;
    }

    if (delta.function) {
      if (delta.function.name) {
        toolCall.name = delta.function.name;
      }
      if (delta.function.arguments) {
        toolCall.arguments += delta.function.arguments;
      }
    }
  }

  protected finish(): StreamResult<ChatMessage> {
    for (const toolCall of this.activeToolCalls.values()) {
      if (toolCall.id && toolCall.name) {
        let input: any = {};
        try {
          input = JSON.parse(toolCall.arguments);
        } catch {
          input = {};
        }

        const completedToolCall: ToolCall = {id: toolCall.id, name: toolCall.name, input};

        this.completedToolCalls.push(completedToolCall);
      }
    }

    return {
      message: {
        role: 'assistant' as const,
        content: this.accumulatedContent,
        ...(this.accumulatedThinking && {reasoning_content: this.accumulatedThinking}),
        ...(this.completedToolCalls.length > 0
          && {
            tool_calls: this.completedToolCalls.map(tc => ({
              id: tc.id,
              type: 'function' as const,
              function: {name: tc.name, arguments: JSON.stringify(tc.input)},
            })),
          }),
      },
      tokenUsage: {
        inputTokens: this.inputTokens,
        outputTokens: this.outputTokens,
        cacheCreationTokens: this.cacheCreationTokens,
        cacheReadTokens: this.cacheReadTokens,
      },
    };
  }
}
