import { Static, Text } from 'ink';
import React, { useMemo } from 'react';
import { UIMessage } from '../../types/uiMessage';
import { colors } from '../theme/colors';
import { Header } from './Header';
import { MessageItem } from './MessageItem';

type StaticItem = {type: 'header'; sessionId: string;} | {
  type: 'message';
  message: UIMessage;
  index: number;
};

interface MessageListProps {
  messages: UIMessage[];
  sessionId: string;
  isLoading: boolean;
  streamingOutput: boolean;
}

export const MessageList = React.memo(
  function MessageList(
    {messages, sessionId, isLoading, streamingOutput}: MessageListProps,
  ): React.ReactElement {
    const staticItems = useMemo(() => {
      const items: StaticItem[] = [{type: 'header', sessionId: sessionId}];
      const msgs = isLoading && messages.length > 0 ? messages.slice(0, -1) : messages;
      msgs.forEach((message, index) => {
        items.push({type: 'message', message, index});
      });
      return items;
    }, [messages, sessionId, isLoading]);

    const isHumanMessage = (message: UIMessage | null | undefined): boolean => {
      return message?.role === 'user' && !message?.toolResult;
    };

    const getShowIcon = (index: number): boolean => {
      if (index === 0) return false;
      const prev = messages[index - 1];
      return isHumanMessage(prev);
    };

    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const shouldShowLastMessage = lastMessage && isLoading
      && (streamingOutput || isHumanMessage(lastMessage));

    return (
      <>
        <Static key={sessionId} items={staticItems}>
          {item => {
            if (item.type === 'header') {
              return <Header key={item.sessionId} sessionId={item.sessionId} />;
            }
            return (
              <MessageItem
                key={`${sessionId}-${item.index}`}
                message={item.message}
                showIcon={getShowIcon(item.index)}
              />
            );
          }}
        </Static>
        {messages.length === 0 && (
          <Text>
            Omni Context CLI. Tell Omx <Text color={colors.primary}>what you want to do.</Text>
          </Text>
        )}
        {shouldShowLastMessage && (
          <MessageItem message={lastMessage} showIcon={getShowIcon(messages.length - 1)} />
        )}
      </>
    );
  },
);
