import { memo } from 'react';
import type { UIMessage } from '../types/uiMessage';
import { AssistantBlock } from './AssistantBlock';
import { ThinkingBlock } from './ThinkingBlock';
import { ToolCallBlock } from './ToolCallBlock';
import { UserBlock } from './UserBlock';

interface MessageItemProps {
  message: UIMessage;
  isLoading?: boolean;
}

export const MessageItem = memo(
  function MessageItem({message, isLoading = false}: MessageItemProps) {
    switch (message.role) {
      case 'user':
        return <UserBlock content={message.content} />;

      case 'assistant':
        return <AssistantBlock content={message.content} />;

      case 'thinking':
        return <ThinkingBlock content={message.content} loading={isLoading} />;

      case 'tool_call':
        return (
          <ToolCallBlock toolName={message.toolName || 'Tool'} toolResult={message.toolResult} />
        );

      default:
        return null;
    }
  },
);
