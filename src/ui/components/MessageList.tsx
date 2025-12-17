import { Text } from 'ink';
import React from 'react';
import { UIMessage } from '../../types/uiMessage';
import { colors } from '../theme/colors';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: UIMessage[];
  sessionId: string;
}

export function MessageList({messages, sessionId}: MessageListProps): React.ReactElement {
  if (messages.length === 0) {
    return (
      <Text>
        Omni Context CLI. Tell Omx <Text color={colors.primary}>what you want to do.</Text>
      </Text>
    );
  }

  const completed = messages.slice(0, -1);
  const last = messages[messages.length - 1];

  const getShowIcon = (index: number): boolean => {
    const prev = index > 0 ? messages[index - 1] : null;
    return messages[index].role === 'assistant' && prev?.role === 'user';
  };

  return (
    <>
      {completed.map((message, index) => (
        <MessageItem
          key={`${sessionId}-${index}`}
          message={message}
          showIcon={getShowIcon(index)}
        />
      ))}
      <MessageItem message={last} showIcon={getShowIcon(messages.length - 1)} />
    </>
  );
}
