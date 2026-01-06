import { ToolCall } from '../types/streamCallbacks';
import { BaseStreamHandler } from './baseStreamHandler';

interface ToolCallAccumulator {
  id: string;
  name: string;
  input: string;
}

export class AnthropicStreamHandler extends BaseStreamHandler {
  private currentToolCall: ToolCallAccumulator | null = null;
  private currentThinking = '';
  private currentThinkingSignature = '';

  protected processChunk(chunk: any): void {
    if (!chunk.event) return;

    const data = JSON.parse(chunk.data || '{}');

    switch (chunk.event) {
      case 'error':
        const errorMessage = data?.error?.message || data?.message || 'Unknown error';
        throw new Error(errorMessage);

      case 'message_start':
        if (data?.message?.usage?.input_tokens) {
          this.inputTokens = data.message.usage.input_tokens;
        }
        if (data?.message?.usage?.cache_creation_input_tokens) {
          this.inputTokens += data.message.usage.cache_creation_input_tokens;
        }
        break;

      case 'message_delta':
        if (data?.delta?.stop_reason === 'model_context_window_exceeded') {
          throw new Error('Context window exceeded');
        }
        if (data?.usage?.output_tokens) {
          this.outputTokens = data.usage.output_tokens;
        }
        if (data?.usage?.input_tokens && data.usage.input_tokens > 0) {
          this.inputTokens = data.usage.input_tokens;
        }
        if (data?.usage?.cache_creation_input_tokens) {
          this.inputTokens += data.usage.cache_creation_input_tokens;
        }
        if (data?.usage?.cache_read_input_tokens) {
          this.cachedTokens = data.usage.cache_read_input_tokens;
        }
        break;

      case 'content_block_start':
        this.handleContentBlockStart(data);
        break;

      case 'content_block_delta':
        this.handleContentBlockDelta(data);
        break;

      case 'content_block_stop':
        this.handleContentBlockStop(data);
        break;
    }
  }

  private handleContentBlockStart(data: any): void {
    const blockType = data?.content_block?.type;

    if (blockType === 'tool_use') {
      this.currentToolCall = {id: data.content_block.id, name: data.content_block.name, input: ''};
    } else if (blockType === 'thinking') {
      this.currentThinking = '';
    }
  }

  private handleContentBlockDelta(data: any): void {
    const deltaType = data.delta?.type;

    if (deltaType === 'text_delta') {
      const text = data.delta.text;
      this.accumulatedContent += text;
      if (this.accumulatedContent.trim()) {
        this.callbacks.onContent(text);
      }
    }

    if (deltaType === 'thinking_delta') {
      const thinking = data.delta.thinking;
      this.currentThinking += thinking;
      this.accumulatedThinking += thinking;
      if (this.accumulatedThinking.trim()) {
        this.callbacks.onThinking(thinking);
      }
    }

    if (deltaType === 'signature_delta') {
      const signature = data.delta.signature;
      this.currentThinkingSignature += signature;
      this.accumulatedThinkingSignature += signature;
    }

    if (deltaType === 'input_json_delta' && this.currentToolCall) {
      this.currentToolCall.input += data.delta.partial_json;
    }
  }

  private handleContentBlockStop(_data: any): void {
    if (this.currentThinking) {
      this.currentThinking = '';
      this.currentThinkingSignature = '';
    }

    if (this.currentToolCall?.id && this.currentToolCall.name) {
      let input: any = {};
      try {
        input = JSON.parse(this.currentToolCall.input);
      } catch {
        input = {};
      }

      const completedToolCall: ToolCall = {
        id: this.currentToolCall.id,
        name: this.currentToolCall.name,
        input,
      };

      this.completedToolCalls.push(completedToolCall);
      this.currentToolCall = null;
    }
  }

  protected finish() {
    const content: any[] = [];

    if (this.accumulatedThinking) {
      content.push({
        type: 'thinking',
        thinking: this.accumulatedThinking,
        signature: this.accumulatedThinkingSignature,
      });
    }

    if (this.accumulatedContent) {
      content.push({type: 'text', text: this.accumulatedContent});
    }

    for (const toolCall of this.completedToolCalls) {
      content.push({type: 'tool_use', id: toolCall.id, name: toolCall.name, input: toolCall.input});
    }

    return {
      message: {role: 'assistant' as const, content},
      tokenUsage: {
        inputTokens: this.inputTokens + this.cachedTokens,
        outputTokens: this.outputTokens,
        cachedTokens: this.cachedTokens,
      },
    };
  }
}
