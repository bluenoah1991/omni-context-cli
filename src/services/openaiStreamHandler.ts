import { ChatMessage } from '../types/session';
import { StreamResult, ToolCall } from '../types/streamCallbacks';
import { extractThinking } from '../utils/messageUtils';
import { BaseStreamHandler } from './baseStreamHandler';

interface ToolCallAccumulator {
  id?: string;
  name: string;
  arguments: string;
}

interface ReasoningDetail {
  type: string;
  text?: string;
  summary?: string;
  data?: string;
  id?: string | null;
  format?: string;
  signature?: string;
  index: number;
}

export class OpenAIStreamHandler extends BaseStreamHandler {
  private activeToolCalls = new Map<number, ToolCallAccumulator>();
  private reasoning = '';
  private reasoningContent = '';
  private reasoningDetailsAccumulator = new Map<string, ReasoningDetail>();

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

    if (delta.reasoning) {
      this.reasoning += delta.reasoning;
    }

    if (delta.reasoning_content) {
      this.reasoningContent += delta.reasoning_content;
    }

    if (Array.isArray(delta.reasoning_details)) {
      for (const detail of delta.reasoning_details) {
        const index = detail.index ?? 0;
        const key = `${detail.type}-${index}`;
        const existing = this.reasoningDetailsAccumulator.get(key);

        if (existing) {
          if (detail.text !== undefined) {
            existing.text = (existing.text || '') + detail.text;
          }
          if (detail.summary !== undefined) {
            existing.summary = (existing.summary || '') + detail.summary;
          }
          if (detail.data !== undefined) {
            existing.data = (existing.data || '') + detail.data;
          }
          if (detail.id !== undefined) existing.id = detail.id;
          if (detail.format !== undefined) existing.format = detail.format;
          if (detail.signature !== undefined) existing.signature = detail.signature;
        } else {
          this.reasoningDetailsAccumulator.set(key, {
            type: detail.type,
            text: detail.text,
            summary: detail.summary,
            data: detail.data,
            id: detail.id,
            format: detail.format,
            signature: detail.signature,
            index,
          });
        }
      }
    }

    const thinking = extractThinking(delta);
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

    const reasoningDetails = this.reasoningDetailsAccumulator.size > 0
      ? Array.from(this.reasoningDetailsAccumulator.values())
      : undefined;

    return {
      message: {
        role: 'assistant' as const,
        content: this.accumulatedContent,
        ...(this.reasoning && {reasoning: this.reasoning}),
        ...(this.reasoningContent && {reasoning_content: this.reasoningContent}),
        ...(reasoningDetails && {reasoning_details: reasoningDetails}),
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
