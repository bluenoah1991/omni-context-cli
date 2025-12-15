import { Box, Text } from 'ink';
import React from 'react';

interface ThinkingBlockProps {
  content: string;
}

export function ThinkingBlock({content}: ThinkingBlockProps): React.ReactElement | null {
  if (!content) {
    return null;
  }

  return (
    <Box marginY={1}>
      <Box marginRight={1}>
        <Text color='gray'>{' '}</Text>
      </Box>
      <Box flexDirection='column' flexGrow={1}>
        <Text color='gray'>{content}</Text>
      </Box>
    </Box>
  );
}
