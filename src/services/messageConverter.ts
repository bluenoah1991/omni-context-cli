import { AnthropicMessage } from '../types/anthropicMessage';
import { Provider } from '../types/config';
import { GeminiMessage } from '../types/geminiMessage';
import { OpenAIMessage } from '../types/openaiMessage';
import {
  ResponsesContentItem,
  ResponsesFunctionCall,
  ResponsesFunctionCallOutput,
  ResponsesMessage,
  ResponsesMessageItem,
  ResponsesReasoningItem,
} from '../types/responsesMessage';
import { ChatMessage } from '../types/session';
import { PendingToolCall } from '../types/tool';
import { UIMessage } from '../types/uiMessage';
import { extractThinking } from '../utils/messageUtils';
import { formatToolCall } from './toolExecutor';

function openAIMessageToUI(
  message: OpenAIMessage,
  timestamp: number,
  pendingToolCalls: Map<string, PendingToolCall>,
): UIMessage[] {
  const uiMessages: UIMessage[] = [];

  switch (message.role) {
    case 'user': {
      let content = '';
      const attachments: Array<{url: string; mimeType: string; fileName?: string;}> = [];
      if (typeof message.content === 'string') {
        content = message.content;
      } else if (Array.isArray(message.content)) {
        const textParts = message.content.filter(part => part.type === 'text').map(part =>
          part.text
        );
        content = textParts.join('\n');
        message.content.forEach(part => {
          if (part.type === 'image_url') {
            const url = part.image_url.url;
            const mimeType = url.startsWith('data:') ? url.split(';')[0].slice(5) : 'image/png';
            attachments.push({url, mimeType});
          } else if (part.type === 'file') {
            const url = part.file.file_data;
            const mimeType = url.startsWith('data:')
              ? url.split(';')[0].slice(5)
              : 'application/pdf';
            attachments.push({url, mimeType, fileName: part.file.filename});
          }
        });
      }
      if (content.trim() || attachments.length > 0) {
        uiMessages.push({
          role: 'user',
          content,
          timestamp,
          ...(attachments.length > 0 && {attachments}),
        });
      }
      break;
    }

    case 'assistant': {
      const thinking = extractThinking(message);
      if (thinking && thinking.trim()) {
        uiMessages.push({role: 'thinking', content: thinking, timestamp});
      }

      if (typeof message.content === 'string') {
        if (message.content.trim()) {
          uiMessages.push({role: 'assistant', content: message.content, timestamp});
        }
      } else if (Array.isArray(message.content)) {
        const textParts = message.content.filter(part => part.type === 'text').map(part =>
          part.text
        );
        if (textParts.length > 0) {
          const content = textParts.join('\n');
          if (content.trim()) {
            uiMessages.push({role: 'assistant', content, timestamp});
          }
        }
      }

      if (message.tool_calls && message.tool_calls.length > 0) {
        message.tool_calls.forEach(toolCall => {
          let formatted = toolCall.function.arguments;
          try {
            formatted = formatToolCall(
              toolCall.function.name,
              JSON.parse(toolCall.function.arguments),
            );
          } catch {}
          pendingToolCalls.set(toolCall.id, {
            content: formatted,
            timestamp,
            toolName: toolCall.function.name,
          });
        });
      }
      break;
    }

    case 'tool': {
      const toolCallId = message.tool_call_id ?? '';
      const pending = pendingToolCalls.get(toolCallId);
      if (pending) {
        pendingToolCalls.delete(toolCallId);
        let resultContent = '';
        if (typeof message.content === 'string') {
          resultContent = message.content;
        } else if (Array.isArray(message.content)) {
          resultContent = message.content.filter(part => part.type === 'text').map(part =>
            part.text
          ).join('\n');
        }
        uiMessages.push({
          role: 'tool_call',
          content: pending.content,
          timestamp: pending.timestamp,
          toolName: pending.toolName,
          toolCallId,
        });
        uiMessages.push({
          role: 'tool_result',
          content: resultContent,
          timestamp,
          toolName: pending.toolName,
          toolCallId,
        });
      }
      break;
    }
  }

  return uiMessages;
}

function anthropicMessageToUI(
  message: AnthropicMessage,
  timestamp: number,
  pendingToolCalls: Map<string, PendingToolCall>,
): UIMessage[] {
  const uiMessages: UIMessage[] = [];

  if (typeof message.content === 'string') {
    if (message.content.trim()) {
      uiMessages.push({
        role: message.role === 'user' ? 'user' : 'assistant',
        content: message.content,
        timestamp,
      });
    }
    return uiMessages;
  }

  const thinkingBlocks = message.content.filter(block => block.type === 'thinking');
  if (thinkingBlocks.length > 0) {
    const content = thinkingBlocks.map(block => block.thinking).join('\n');
    if (content.trim()) {
      uiMessages.push({role: 'thinking', content, timestamp});
    }
  }

  const textBlocks = message.content.filter(block => block.type === 'text');
  const content = textBlocks.map(block => block.text).join('\n');

  if (message.role === 'user') {
    const attachments: Array<{url: string; mimeType: string; fileName?: string;}> = [];
    message.content.forEach(block => {
      if (block.type === 'image') {
        attachments.push({
          url: `data:${block.source.media_type};base64,${block.source.data}`,
          mimeType: block.source.media_type,
        });
      } else if (block.type === 'document') {
        attachments.push({
          url: `data:${block.source.media_type};base64,${block.source.data}`,
          mimeType: block.source.media_type,
          fileName: block.title,
        });
      }
    });
    if (content.trim() || attachments.length > 0) {
      uiMessages.push({
        role: 'user',
        content,
        timestamp,
        ...(attachments.length > 0 && {attachments}),
      });
    }
  } else if (content.trim()) {
    uiMessages.push({role: 'assistant', content, timestamp});
  }

  message.content.forEach(block => {
    if (block.type === 'tool_use') {
      pendingToolCalls.set(block.id, {
        content: formatToolCall(block.name, block.input as Record<string, unknown>),
        timestamp,
        toolName: block.name,
      });
    } else if (block.type === 'tool_result') {
      const pending = pendingToolCalls.get(block.tool_use_id);
      if (pending) {
        pendingToolCalls.delete(block.tool_use_id);
        let resultContent = '';
        if (typeof block.content === 'string') {
          resultContent = block.content;
        } else {
          resultContent = block.content.filter(part => part.type === 'text').map(part => part.text)
            .join('\n');
        }
        uiMessages.push({
          role: 'tool_call',
          content: pending.content,
          timestamp: pending.timestamp,
          toolName: pending.toolName,
          toolCallId: block.tool_use_id,
        });
        uiMessages.push({
          role: 'tool_result',
          content: resultContent,
          timestamp,
          toolName: pending.toolName,
          toolCallId: block.tool_use_id,
        });
      }
    }
  });

  return uiMessages;
}

function geminiMessageToUI(
  message: GeminiMessage,
  timestamp: number,
  pendingToolCalls: Map<string, PendingToolCall>,
): UIMessage[] {
  const uiMessages: UIMessage[] = [];

  const thinkingParts = message.parts.filter(part => part.thought === true);
  if (thinkingParts.length > 0) {
    const content = thinkingParts.map(part => part.text || '').join('\n');
    if (content.trim()) {
      uiMessages.push({role: 'thinking', content, timestamp});
    }
  }

  const textParts = message.parts.filter(part => part.text !== undefined && !part.thought);
  const mediaParts = message.parts.filter(part => part.inlineData?.mimeType);
  const attachments = mediaParts.map(part => ({
    url: `data:${part.inlineData!.mimeType};base64,${part.inlineData!.data}`,
    mimeType: part.inlineData!.mimeType,
    fileName: part.inlineData!.fileName,
  }));

  const content = textParts.map(part => part.text || '').join('\n');
  if (content.trim() || attachments.length > 0) {
    uiMessages.push({
      role: message.role === 'user' ? 'user' : 'assistant',
      content,
      timestamp,
      ...(attachments.length > 0 && {attachments}),
    });
  }

  message.parts.forEach(part => {
    if (part.functionCall) {
      const functionCall = part.functionCall;
      const id = functionCall.id || functionCall.name;
      pendingToolCalls.set(id, {
        content: formatToolCall(functionCall.name, functionCall.args as Record<string, unknown>),
        timestamp,
        toolName: functionCall.name,
      });
    } else if (part.functionResponse) {
      const functionResponse = part.functionResponse;
      const id = functionResponse.id || functionResponse.name;
      const pending = pendingToolCalls.get(id);
      if (pending) {
        pendingToolCalls.delete(id);
        uiMessages.push({
          role: 'tool_call',
          content: pending.content,
          timestamp: pending.timestamp,
          toolName: pending.toolName,
          toolCallId: id,
        });
        uiMessages.push({
          role: 'tool_result',
          content: JSON.stringify(functionResponse.response),
          timestamp,
          toolName: pending.toolName,
          toolCallId: id,
        });
      }
    }
  });

  return uiMessages;
}

function responsesItemToUI(
  item: ResponsesContentItem,
  timestamp: number,
  pendingToolCalls: Map<string, PendingToolCall>,
): UIMessage[] {
  const uiMessages: UIMessage[] = [];

  if (item.type === 'message') {
    const message = item as ResponsesMessageItem;
    let content = '';
    const attachments: Array<{url: string; mimeType: string; fileName?: string;}> = [];

    if (typeof message.content === 'string') {
      content = message.content;
    } else {
      const textParts: string[] = [];
      message.content.forEach(c => {
        if (c.type === 'output_text' || c.type === 'input_text') {
          textParts.push(c.text);
        } else if (message.role === 'user') {
          if (c.type === 'input_image') {
            const url = c.image_url;
            const mimeType = url.startsWith('data:') ? url.split(';')[0].slice(5) : 'image/png';
            attachments.push({url, mimeType});
          } else if (c.type === 'input_file') {
            const url = c.file_data;
            const mimeType = url.startsWith('data:')
              ? url.split(';')[0].slice(5)
              : 'application/pdf';
            attachments.push({url, mimeType, fileName: c.filename});
          }
        }
      });
      content = textParts.join('');
    }

    if (content.trim() || attachments.length > 0) {
      uiMessages.push({
        role: message.role === 'user' ? 'user' : 'assistant',
        content,
        timestamp,
        ...(attachments.length > 0 && {attachments}),
      });
    }
  } else if (item.type === 'function_call') {
    const functionCall = item as ResponsesFunctionCall;
    let formatted = functionCall.arguments;
    try {
      formatted = formatToolCall(functionCall.name, JSON.parse(functionCall.arguments));
    } catch {}
    pendingToolCalls.set(functionCall.call_id, {
      content: formatted,
      timestamp,
      toolName: functionCall.name,
    });
  } else if (item.type === 'function_call_output') {
    const functionCallOutput = item as ResponsesFunctionCallOutput;
    const pending = pendingToolCalls.get(functionCallOutput.call_id);
    if (pending) {
      pendingToolCalls.delete(functionCallOutput.call_id);
      uiMessages.push({
        role: 'tool_call',
        content: pending.content,
        timestamp: pending.timestamp,
        toolName: pending.toolName,
        toolCallId: functionCallOutput.call_id,
      });
      let outputText: string;
      if (typeof functionCallOutput.output === 'string') {
        outputText = functionCallOutput.output;
      } else {
        const textPart = functionCallOutput.output.find(p => p.type === 'input_text');
        outputText = textPart ? textPart.text : '';
      }
      uiMessages.push({
        role: 'tool_result',
        content: outputText,
        timestamp,
        toolName: pending.toolName,
        toolCallId: functionCallOutput.call_id,
      });
    }
  } else if (item.type === 'reasoning') {
    const reasoning = item as ResponsesReasoningItem;
    const text = reasoning.summary?.map(s => s.text).join('\n') || '';
    if (text.trim()) {
      uiMessages.push({role: 'thinking', content: text, timestamp});
    }
  }

  return uiMessages;
}

export function sessionMessagesToUI(messages: ChatMessage[], provider: Provider): UIMessage[] {
  const uiMessages: UIMessage[] = [];
  const pendingToolCalls = new Map<string, PendingToolCall>();

  messages.forEach((message, index) => {
    const timestamp = Date.now() - (messages.length - index) * 1000;

    if (provider === 'responses') {
      const wrapper = message as ResponsesMessage;
      wrapper.items.forEach(item => {
        uiMessages.push(...responsesItemToUI(item, timestamp, pendingToolCalls));
      });
    } else if (provider === 'openai') {
      uiMessages.push(...openAIMessageToUI(message as OpenAIMessage, timestamp, pendingToolCalls));
    } else if (provider === 'gemini') {
      uiMessages.push(...geminiMessageToUI(message as GeminiMessage, timestamp, pendingToolCalls));
    } else {
      uiMessages.push(
        ...anthropicMessageToUI(message as AnthropicMessage, timestamp, pendingToolCalls),
      );
    }
  });

  return uiMessages;
}
