import { Box, Text } from 'ink';
import React from 'react';
import { useCleanedContent, useContentWidth } from '../hooks';
import { colors } from '../theme/colors';

interface ThinkingBlockProps {
  content: string;
}

export function ThinkingBlock({content}: ThinkingBlockProps): React.ReactElement | null {
  const contentWidth = useContentWidth();
  const cleanContent = useCleanedContent(content);

  if (!cleanContent) {
    return null;
  }

  return (
    <Box marginBottom={1}>
      <Box marginRight={1}>
        <Text color={colors.muted}>{' '}</Text>
      </Box>
      <Box marginRight={3} flexDirection='column' width={contentWidth}>
        <Text color={colors.muted} wrap='wrap'>{cleanContent}</Text>
      </Box>
    </Box>
  );
}
