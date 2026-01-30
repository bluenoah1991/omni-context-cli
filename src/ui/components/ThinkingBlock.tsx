import { Box, Text } from 'ink';
import React from 'react';
import { useContentWidth } from '../hooks/useContentWidth';
import { colors } from '../theme/colors';

interface ThinkingBlockProps {
  content: string;
  showIcon?: boolean;
}

export const ThinkingBlock = React.memo(
  function ThinkingBlock(
    {content, showIcon = false}: ThinkingBlockProps,
  ): React.ReactElement | null {
    const contentWidth = useContentWidth();
    const text = content?.trim();

    if (!text) {
      return null;
    }

    return (
      <Box marginBottom={1}>
        <Box marginRight={1}>
          {showIcon && <Text color={colors.accent} bold>{'*'}</Text>}
          {!showIcon && <Text color={colors.muted}>{' '}</Text>}
        </Box>
        <Box marginRight={3} flexDirection='column' width={contentWidth}>
          <Text color={colors.muted} wrap='wrap'>{text}</Text>
        </Box>
      </Box>
    );
  },
);
