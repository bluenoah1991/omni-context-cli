import { Box, Text } from 'ink';
import React from 'react';
import { UIMessage } from '../../types/uiMessage';
import { MarkdownText } from './MarkdownText';
import { ThinkingBlock } from './ThinkingBlock';
import { ToolCallBlock } from './ToolCallBlock';

interface MessageItemProps {
  message: UIMessage;
}

export function MessageItem({message}: MessageItemProps): React.ReactElement {
  switch (message.role) {
    case 'user':
      return (
        <Box marginY={1}>
          <Box marginRight={1}>
            <Text color='green' bold>{'❯'}</Text>
          </Box>
          <Box flexDirection='column' flexGrow={1}>
            <Text color='white'>{message.content}</Text>
          </Box>
        </Box>
      );

    case 'assistant':
      return (
        <Box marginY={1} flexDirection='column'>
          <Box marginBottom={1}>
            <Text color='magenta' bold>{'◆'}</Text>
            <Text color='gray'>Assistant</Text>
          </Box>
          <Box paddingLeft={2}>
            <MarkdownText content={message.content} />
          </Box>
        </Box>
      );

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
}
