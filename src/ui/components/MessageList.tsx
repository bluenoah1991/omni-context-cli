import { Box } from 'ink';
import React from 'react';
import { UIMessage } from '../../types/uiMessage';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: UIMessage[];
}

export function MessageList({messages}: MessageListProps): React.ReactElement {
  return (
    <Box flexDirection='column'>
      {messages.map((message, index) => <MessageItem key={index} message={message} />)}
    </Box>
  );
}
