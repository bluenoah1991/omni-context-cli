import { Box, Text } from 'ink';
import React from 'react';
import { UIMessage } from '../../types/uiMessage';
import { colors } from '../theme/colors';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: UIMessage[];
}

export function MessageList({messages}: MessageListProps): React.ReactElement {
  return (
    <Box flexDirection='column' flexGrow={1}>
      {messages.length === 0
        ? (
          <Text>
            Omni Context CLI. Tell Omx <Text color={colors.primary}>what you want to do.</Text>
          </Text>
        )
        : (messages.map((message, index) => {
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const showIcon = message.role === 'assistant' && prevMessage?.role === 'user';
          return <MessageItem key={index} message={message} showIcon={showIcon} />;
        }))}
    </Box>
  );
}
