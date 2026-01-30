import { Box, Text } from 'ink';
import React from 'react';
import { useContentWidth } from '../hooks/useContentWidth';
import { Markdown } from '../markdown';
import { colors } from '../theme/colors';

interface AssistantBlockProps {
  content: string;
  showIcon?: boolean;
}

export const AssistantBlock = React.memo(
  function AssistantBlock(
    {content, showIcon = false}: AssistantBlockProps,
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
          {!showIcon && <Text>{' '}</Text>}
        </Box>
        <Box marginRight={3} flexDirection='column' width={contentWidth}>
          <Markdown markdown={text} />
        </Box>
      </Box>
    );
  },
);
