import { Text } from 'ink';
import React from 'react';
import { UIMessage } from '../../types/uiMessage';
import { AssistantBlock } from './AssistantBlock';
import { ThinkingBlock } from './ThinkingBlock';
import { ToolCallBlock } from './ToolCallBlock';
import { UserBlock } from './UserBlock';

interface MessageItemProps {
  message: UIMessage;
  showIcon?: boolean;
}

export const MessageItem = React.memo(
  function MessageItem({message, showIcon}: MessageItemProps): React.ReactElement {
    switch (message.role) {
      case 'user':
        return <UserBlock content={message.content} />;

      case 'assistant':
        return <AssistantBlock content={message.content} showIcon={showIcon} />;

      case 'thinking':
        return <ThinkingBlock content={message.content} showIcon={showIcon} />;

      case 'tool_call':
        return (
          <ToolCallBlock
            type='call'
            toolName={message.toolName || 'unknown'}
            content={message.content}
          />
        );

      case 'tool_result':
        return (
          <ToolCallBlock
            type='result'
            toolName={message.toolName || 'unknown'}
            content={message.content}
          />
        );

      default:
        return <Text>{message.content}</Text>;
    }
  },
);
