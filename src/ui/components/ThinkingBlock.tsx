import { Box, Text } from 'ink';
import React from 'react';
import { useContentWidth } from '../hooks';

interface ThinkingBlockProps {
  content: string;
}

export function ThinkingBlock({content}: ThinkingBlockProps): React.ReactElement | null {
  const contentWidth = useContentWidth();

  if (!content) {
    return null;
  }

  return (
    <Box marginBottom={1}>
      <Box marginRight={1}>
        <Text color='gray'>{' '}</Text>
      </Box>
      <Box marginRight={3} flexDirection='column' width={contentWidth}>
        <Text color='gray' wrap='wrap'>{content}</Text>
      </Box>
    </Box>
  );
}
