import { ModelConfig } from '../types/config';
import { GeminiMessage, GeminiPart } from '../types/geminiMessage';
import { StreamResult } from '../types/streamCallbacks';
import { BaseStreamHandler } from './baseStreamHandler';
import { setMedia } from './mediaBuffer';

interface ToolCallAccumulator {
  id?: string;
  name: string;
  args: Record<string, unknown>;
  thoughtSignature?: string;
}

export class GeminiStreamHandler extends BaseStreamHandler {
  private activeToolCalls: ToolCallAccumulator[] = [];
  private thinkingSignature = '';
  private contentSignature = '';
  private accumulatedMedia: Array<{mimeType: string; data: string; thoughtSignature?: string;}> =
    [];

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
    if (part.thought && part.text) {
      this.accumulatedThinking += part.text;
      if (part.thoughtSignature) {
        this.thinkingSignature = part.thoughtSignature;
      }
      if (this.accumulatedThinking.trim()) {
        this.callbacks.onThinking?.(part.text);
      }
      return;
    }

    if (
      part.thoughtSignature && part.text === undefined && !part.inlineData && !part.functionCall
    ) {
      this.thinkingSignature = part.thoughtSignature;
    }

    if (part.text !== undefined && !part.thought) {
      this.accumulatedContent += part.text;
      if (part.thoughtSignature) {
        this.contentSignature = part.thoughtSignature;
      }
      if (this.accumulatedContent.trim()) {
        this.callbacks.onContent?.(part.text);
      }
    }

    if (part.functionCall) {
      this.activeToolCalls.push({
        id: part.functionCall.id,
        name: part.functionCall.name || '',
        args: part.functionCall.args || {},
        thoughtSignature: part.thoughtSignature,
      });
    }

    if (part.inlineData?.mimeType) {
      this.accumulatedMedia.push({
        mimeType: part.inlineData.mimeType,
        data: part.inlineData.data,
        ...(part.thoughtSignature && {thoughtSignature: part.thoughtSignature}),
      });
      setMedia({data: part.inlineData.data, mimeType: part.inlineData.mimeType});
      this.callbacks.onMedia?.({
        url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
        mimeType: part.inlineData.mimeType,
      });
    }
  }

  protected finish(): StreamResult<GeminiMessage> {
    const parts: GeminiPart[] = [];

    if (this.accumulatedThinking) {
      parts.push({
        text: this.accumulatedThinking,
        thought: true,
        ...(this.thinkingSignature && {thoughtSignature: this.thinkingSignature}),
      });
    }

    if (this.accumulatedContent) {
      parts.push({
        text: this.accumulatedContent,
        ...(this.contentSignature && {thoughtSignature: this.contentSignature}),
      });
    }

    for (const media of this.accumulatedMedia) {
      const {thoughtSignature, ...inlineData} = media;
      parts.push({inlineData, ...(thoughtSignature && {thoughtSignature})});
    }

    for (const toolCall of this.activeToolCalls) {
      if (toolCall.name) {
        this.completedToolCalls.push({id: toolCall.id, name: toolCall.name, input: toolCall.args});
        parts.push({
          functionCall: {id: toolCall.id, name: toolCall.name, args: toolCall.args},
          ...(toolCall.thoughtSignature && {thoughtSignature: toolCall.thoughtSignature}),
        });
      }
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
