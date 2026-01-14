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

function openAIMessageToUI(
  message: OpenAIMessage,
  timestamp: number,
  pendingToolCalls: Map<string, PendingToolCall>,
): UIMessage[] {
  const uiMessages: UIMessage[] = [];

  switch (message.role) {
    case 'user': {
      if (typeof message.content === 'string') {
        if (message.content.trim()) {
          uiMessages.push({role: 'user', content: message.content, timestamp});
        }
      } else if (Array.isArray(message.content)) {
        const textParts = message.content.filter(part => part.type === 'text').map(part =>
          part.text
        );
        if (textParts.length > 0) {
          const content = textParts.join('\n');
          if (content.trim()) {
            uiMessages.push({role: 'user', content, timestamp});
          }
        }
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
          pendingToolCalls.set(toolCall.id, {
            content: toolCall.function.arguments,
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
  if (textBlocks.length > 0) {
    const content = textBlocks.map(block => block.text).join('\n');
    if (content.trim()) {
      uiMessages.push({role: message.role === 'user' ? 'user' : 'assistant', content, timestamp});
    }
  }

  message.content.forEach(block => {
    if (block.type === 'tool_use') {
      pendingToolCalls.set(block.id, {
        content: JSON.stringify(block.input),
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
  if (textParts.length > 0) {
    const content = textParts.map(part => part.text || '').join('\n');
    if (content.trim()) {
      uiMessages.push({role: message.role === 'user' ? 'user' : 'assistant', content, timestamp});
    }
  }

  message.parts.forEach(part => {
    if (part.functionCall) {
      const functionCall = part.functionCall;
      const id = functionCall.id || functionCall.name;
      pendingToolCalls.set(id, {
        content: JSON.stringify(functionCall.args),
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
    const content = typeof message.content === 'string'
      ? message.content
      : message.content.map(c => c.type === 'output_text' || c.type === 'input_text' ? c.text : '')
        .join('');

    if (content.trim()) {
      uiMessages.push({role: message.role === 'user' ? 'user' : 'assistant', content, timestamp});
    }
  } else if (item.type === 'function_call') {
    const functionCall = item as ResponsesFunctionCall;
    pendingToolCalls.set(functionCall.call_id, {
      content: functionCall.arguments,
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
