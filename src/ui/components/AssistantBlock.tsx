import { Box, Text } from 'ink';
import React from 'react';
import { useCleanedContent } from '../hooks/useCleanedContent';
import { useContentWidth } from '../hooks/useContentWidth';
import { Markdown } from '../markdown';
import { colors } from '../theme/colors';

interface AssistantBlockProps {
  content: string;
  showIcon?: boolean;
}

export function AssistantBlock(
  {content, showIcon = false}: AssistantBlockProps,
): React.ReactElement | null {
  const contentWidth = useContentWidth();
  const cleanedContent = useCleanedContent(content);

  if (!cleanedContent) {
    return null;
  }

  return (
    <Box marginBottom={1}>
      <Box marginRight={1}>
        {showIcon && <Text color={colors.accent} bold>{'*'}</Text>}
        {!showIcon && <Text>{' '}</Text>}
      </Box>
      <Box marginRight={3} flexDirection='column' width={contentWidth}>
        <Markdown markdown={cleanedContent} />
      </Box>
    </Box>
  );
}
