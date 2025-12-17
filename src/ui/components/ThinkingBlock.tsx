import { Box, Text } from 'ink';
import React from 'react';
import { useCleanedContent } from '../hooks/useCleanedContent';
import { useContentWidth } from '../hooks/useContentWidth';
import { colors } from '../theme/colors';

interface ThinkingBlockProps {
  content: string;
  showIcon?: boolean;
}

export function ThinkingBlock(
  {content, showIcon = false}: ThinkingBlockProps,
): React.ReactElement | null {
  const contentWidth = useContentWidth();
  const cleanContent = useCleanedContent(content);

  if (!cleanContent) {
    return null;
  }

  return (
    <Box marginBottom={1}>
      <Box marginRight={1}>
        {showIcon && <Text color={colors.accent} bold>{'*'}</Text>}
        {!showIcon && <Text color={colors.muted}>{' '}</Text>}
      </Box>
      <Box marginRight={3} flexDirection='column' width={contentWidth}>
        <Text color={colors.muted} wrap='wrap'>{cleanContent}</Text>
      </Box>
    </Box>
  );
}
