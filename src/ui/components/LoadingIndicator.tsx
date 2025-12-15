import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import React from 'react';

interface LoadingIndicatorProps {
  text?: string;
}

export function LoadingIndicator({text = 'Thinking'}: LoadingIndicatorProps): React.ReactElement {
  return (
    <Box>
      <Text color='cyan'>
        <Spinner type='dots' />
      </Text>
      <Text color='gray'>{text}...</Text>
    </Box>
  );
}
