import { Box, Text } from 'ink';
import React from 'react';

interface UserBlockProps {
  content: string;
}

export function UserBlock({content}: UserBlockProps): React.ReactElement {
  return (
    <Box marginY={1}>
      <Box marginRight={1}>
        <Text color='green' bold>{'❯'}</Text>
      </Box>
      <Box flexDirection='column' flexGrow={1}>
        <Text color='white'>{content}</Text>
      </Box>
    </Box>
  );
}
