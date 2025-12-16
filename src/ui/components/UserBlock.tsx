import { Box, Text } from 'ink';
import React from 'react';
import { useContentWidth } from '../hooks';

interface UserBlockProps {
  content: string;
}

export function UserBlock({content}: UserBlockProps): React.ReactElement {
  const contentWidth = useContentWidth();

  return (
    <Box marginBottom={1}>
      <Box marginRight={1}>
        <Text color='green' bold>{'❯'}</Text>
      </Box>
      <Box marginRight={3} flexDirection='column' width={contentWidth}>
        <Text color='white' wrap='wrap'>{content}</Text>
      </Box>
    </Box>
  );
}
