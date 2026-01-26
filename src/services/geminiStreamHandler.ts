import { ModelConfig } from '../types/config';
import { GeminiMessage, GeminiPart } from '../types/geminiMessage';
import { StreamResult } from '../types/streamCallbacks';
import { BaseStreamHandler } from './baseStreamHandler';

interface ToolCallAccumulator {
  id?: string;
  name: string;
  args: Record<string, unknown>;
}

export class GeminiStreamHandler extends BaseStreamHandler {
  private activeToolCalls: ToolCallAccumulator[] = [];
  private currentThinkingSignature = '';

  protected getEndpoint(model: ModelConfig): string {
    const baseUrl = model.apiUrl.replace(/\/$/, '');
    return `${baseUrl}/models/${model.name}:streamGenerateContent?alt=sse`;
  }

  protected processChunk(chunk: any): void {
    if (chunk.data === '[DONE]') {
      return;
    }

    const data = JSON.parse(chunk.data);

    if (data.error) {
      const errorMessage = data.error.message || JSON.stringify(data.error);
      throw new Error(errorMessage);
    }

    if (data.usageMetadata) {
      this.inputTokens = data.usageMetadata.promptTokenCount || 0;
      this.outputTokens = (data.usageMetadata.candidatesTokenCount || 0)
        + (data.usageMetadata.thoughtsTokenCount || 0)
        + (data.usageMetadata.toolUsePromptTokenCount || 0);
      if (data.usageMetadata.cachedContentTokenCount) {
        this.cacheReadTokens = data.usageMetadata.cachedContentTokenCount;
      } else if (data.usageMetadata.cacheTokensDetails?.length) {
        this.cacheReadTokens = data.usageMetadata.cacheTokensDetails.reduce(
          (sum: number, detail: {tokenCount?: number;}) => sum + (detail.tokenCount || 0),
          0,
        );
      }
    }

    const candidate = data.candidates?.[0];
    const content = candidate?.content;

    if (!content?.parts) return;

    for (const part of content.parts) {
      this.processPart(part);
    }
  }

  private processPart(part: any): void {
    if (part.thoughtSignature) {
      this.currentThinkingSignature = part.thoughtSignature;
    }

    if (part.thought && part.text) {
      this.accumulatedThinking += part.text;
      if (this.accumulatedThinking.trim()) {
        this.callbacks.onThinking?.(part.text);
      }
      return;
    }

    if (part.text !== undefined && !part.thought) {
      this.accumulatedContent += part.text;
      if (this.accumulatedContent.trim()) {
        this.callbacks.onContent?.(part.text);
      }
    }

    if (part.functionCall) {
      this.handleFunctionCall(part.functionCall);
    }
  }

  private handleFunctionCall(functionCall: any): void {
    this.activeToolCalls.push({
      id: functionCall.id,
      name: functionCall.name || '',
      args: functionCall.args || {},
    });
  }

  protected finish(): StreamResult<GeminiMessage> {
    for (const toolCall of this.activeToolCalls) {
      if (toolCall.name) {
        this.completedToolCalls.push({id: toolCall.id, name: toolCall.name, input: toolCall.args});
      }
    }

    const parts: GeminiPart[] = [];

    if (this.accumulatedThinking) {
      parts.push({
        text: this.accumulatedThinking,
        thought: true,
        ...(this.currentThinkingSignature && {thoughtSignature: this.currentThinkingSignature}),
      });
    }

    if (this.accumulatedContent) {
      parts.push({text: this.accumulatedContent});
    }

    for (const toolCall of this.completedToolCalls) {
      parts.push({
        functionCall: {
          id: toolCall.id,
          name: toolCall.name,
          args: toolCall.input as Record<string, unknown>,
        },
        ...(this.currentThinkingSignature && {thoughtSignature: this.currentThinkingSignature}),
      });
    }

    return {
      message: {role: 'model' as const, parts},
      tokenUsage: {
        inputTokens: this.inputTokens,
        outputTokens: this.outputTokens,
        cacheCreationTokens: this.cacheCreationTokens,
        cacheReadTokens: this.cacheReadTokens,
      },
    };
  }
}
