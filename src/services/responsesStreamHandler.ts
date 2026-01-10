import {
  ResponsesContentItem,
  ResponsesFunctionCall,
  ResponsesMessage,
  ResponsesMessageItem,
  ResponsesReasoningItem,
} from '../types/responsesMessage';
import { ChatMessage } from '../types/session';
import { StreamCallbacks, StreamResult, ToolCall } from '../types/streamCallbacks';
import { BaseStreamHandler } from './baseStreamHandler';

interface FunctionCallAccumulator {
  id?: string;
  call_id: string;
  name: string;
  arguments: string;
}

export class ResponsesStreamHandler extends BaseStreamHandler {
  private activeFunctionCalls = new Map<number, FunctionCallAccumulator>();
  private outputItems: ResponsesContentItem[] = [];

  protected processChunk(chunk: {data: string; event?: string;}): void {
    if (chunk.data === '[DONE]') {
      return;
    }

    const event = JSON.parse(chunk.data);

    if (event.type === 'error') {
      throw new Error(event.message || JSON.stringify(event));
    }

    switch (event.type) {
      case 'response.created':
        break;

      case 'response.output_item.added':
        this.handleOutputItemAdded(event);
        break;

      case 'response.output_text.delta':
        this.handleTextDelta(event);
        break;

      case 'response.function_call_arguments.delta':
        this.handleFunctionCallDelta(event);
        break;

      case 'response.function_call_arguments.done':
        this.handleFunctionCallDone(event);
        break;

      case 'response.reasoning_summary_text.delta':
      case 'response.reasoning_text.delta':
        this.handleReasoningDelta(event);
        break;

      case 'response.completed':
        this.handleCompleted(event);
        break;

      case 'response.output_item.done':
      case 'response.content_part.done':
      case 'response.in_progress':
        break;
    }
  }

  private handleOutputItemAdded(event: any): void {
    const item = event.item;
    const index = event.output_index;

    if (item.type === 'function_call') {
      this.activeFunctionCalls.set(index, {
        id: item.id,
        call_id: item.call_id || '',
        name: item.name || '',
        arguments: item.arguments || '',
      });
    } else if (item.type === 'message') {
      this.outputItems[index] = item;
    } else if (item.type === 'reasoning') {
      this.outputItems[index] = item;
    }
  }

  private handleTextDelta(event: any): void {
    const delta = event.delta || '';
    this.accumulatedContent += delta;

    if (this.accumulatedContent.trim()) {
      this.callbacks.onContent(delta);
    }
  }

  private handleFunctionCallDelta(event: any): void {
    const index = event.output_index;
    const delta = event.delta || '';

    const functionCall = this.activeFunctionCalls.get(index);
    if (functionCall) {
      functionCall.arguments += delta;
    }
  }

  private handleFunctionCallDone(event: any): void {
    const index = event.output_index;
    const functionCall = this.activeFunctionCalls.get(index);

    if (functionCall) {
      functionCall.name = event.name || functionCall.name;
      functionCall.arguments = event.arguments || functionCall.arguments;
    }
  }

  private handleReasoningDelta(event: any): void {
    const delta = event.delta || '';
    this.accumulatedThinking += delta;

    if (this.accumulatedThinking.trim()) {
      this.callbacks.onThinking(delta);
    }
  }

  private handleCompleted(event: any): void {
    const response = event.response;
    if (response?.usage) {
      this.inputTokens = response.usage.input_tokens || 0;
      this.outputTokens = response.usage.output_tokens || 0;
      if (response.usage.input_tokens_details?.cached_tokens) {
        this.cacheReadTokens = response.usage.input_tokens_details.cached_tokens;
      }
    }
  }

  protected finish(): StreamResult<ChatMessage> {
    for (const [index, functionCall] of this.activeFunctionCalls.entries()) {
      if (functionCall.call_id && functionCall.name) {
        let input: any = {};
        try {
          input = JSON.parse(functionCall.arguments);
        } catch {
          input = {};
        }

        const completedToolCall: ToolCall = {
          id: functionCall.call_id,
          name: functionCall.name,
          input,
        };
        this.completedToolCalls.push(completedToolCall);

        this.outputItems[index] = {
          type: 'function_call',
          id: functionCall.id,
          call_id: functionCall.call_id,
          name: functionCall.name,
          arguments: functionCall.arguments,
          status: 'completed',
        } as ResponsesFunctionCall;
      }
    }

    const outputMessage: ResponsesContentItem[] = [];

    if (this.accumulatedThinking) {
      outputMessage.push(
        {
          type: 'reasoning',
          summary: [{type: 'summary_text', text: this.accumulatedThinking}],
        } as ResponsesReasoningItem,
      );
    }

    if (this.accumulatedContent) {
      outputMessage.push(
        {
          type: 'message',
          role: 'assistant',
          content: this.accumulatedContent,
          status: 'completed',
        } as ResponsesMessageItem,
      );
    }

    for (const item of this.outputItems) {
      if (item && item.type === 'function_call') {
        outputMessage.push(item);
      }
    }

    const wrapper: ResponsesMessage = {
      type: 'responses',
      role: 'assistant',
      items: outputMessage,
      content: this.accumulatedContent,
    };

    return {
      message: wrapper,
      tokenUsage: {
        inputTokens: this.inputTokens,
        outputTokens: this.outputTokens,
        cacheCreationTokens: this.cacheCreationTokens,
        cacheReadTokens: this.cacheReadTokens,
      },
    };
  }
}
