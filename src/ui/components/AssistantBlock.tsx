import { Box, Text } from 'ink';
import React from 'react';
import { useContentWidth } from '../hooks';
import { Markdown } from '../markdown';
import { colors } from '../theme/colors';

interface AssistantBlockProps {
  content: string;
}

export function AssistantBlock({content}: AssistantBlockProps): React.ReactElement {
  const contentWidth = useContentWidth();

  return (
    <Box marginBottom={1}>
      <Box marginRight={1}>
        <Text color={colors.tertiary} bold>{'*'}</Text>
      </Box>
      <Box marginRight={3} flexDirection='column' width={contentWidth}>
        <Markdown markdown={content} />
      </Box>
    </Box>
  );
}
