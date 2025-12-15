import { Box, Text } from 'ink';
import React from 'react';
import { Markdown } from '../markdown';
import { colors } from '../theme/colors';

interface AssistantBlockProps {
  content: string;
}

export function AssistantBlock({content}: AssistantBlockProps): React.ReactElement {
  return (
    <Box marginY={1}>
      <Box marginRight={1}>
        <Text color={colors.tertiary} bold>{'*'}</Text>
      </Box>
      <Box flexDirection='column' flexGrow={1}>
        <Markdown markdown={content} />
      </Box>
    </Box>
  );
}
