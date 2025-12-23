import { Box, Text } from 'ink';
import React from 'react';
import { useContentWidth } from '../hooks/useContentWidth';
import { colors } from '../theme/colors';

interface ErrorBlockProps {
  content: string;
}

export const ErrorBlock = React.memo(
  function ErrorBlock({content}: ErrorBlockProps): React.ReactElement {
    const contentWidth = useContentWidth();

    return (
      <Box marginBottom={1}>
        <Box marginRight={1}>
          <Text color={colors.error} bold>{'✗'}</Text>
        </Box>
        <Box marginRight={3} flexDirection='column' width={contentWidth}>
          <Text color={colors.error} wrap='wrap'>{content}</Text>
        </Box>
      </Box>
    );
  },
);
