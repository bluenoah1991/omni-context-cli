import { Text } from 'ink';
import React from 'react';
import { UIMessage } from '../../types/uiMessage';
import { AssistantBlock } from './AssistantBlock';
import { ThinkingBlock } from './ThinkingBlock';
import { ToolCallBlock } from './ToolCallBlock';
import { UserBlock } from './UserBlock';

interface MessageItemProps {
  message: UIMessage;
}

export const MessageItem = React.memo(
  function MessageItem({message}: MessageItemProps): React.ReactElement {
    switch (message.role) {
      case 'user':
        return <UserBlock content={message.content} />;

      case 'assistant':
        return <AssistantBlock content={message.content} />;

      case 'thinking':
        return <ThinkingBlock content={message.content} />;

      case 'tool_use':
        return <ToolCallBlock toolName={message.toolName || 'unknown'} content={message.content} />;

      case 'tool_result':
        return (
          <ToolCallBlock
            toolName={message.toolName || 'unknown'}
            content={message.content}
            isResult
          />
        );

      default:
        return <Text>{message.content}</Text>;
    }
  },
);
