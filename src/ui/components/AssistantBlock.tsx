import { Box, Text } from 'ink';
import React from 'react';
import { useCleanedContent, useContentWidth } from '../hooks';
import { Markdown } from '../markdown';
import { colors } from '../theme/colors';

interface AssistantBlockProps {
  content: string;
}

export function AssistantBlock({content}: AssistantBlockProps): React.ReactElement | null {
  const contentWidth = useContentWidth();
  const cleanedContent = useCleanedContent(content);

  if (!cleanedContent) {
    return null;
  }

  return (
    <Box marginBottom={1}>
      <Box marginRight={1}>
        <Text color={colors.tertiary} bold>{'*'}</Text>
      </Box>
      <Box marginRight={3} flexDirection='column' width={contentWidth}>
        <Markdown markdown={cleanedContent} />
      </Box>
    </Box>
  );
}
