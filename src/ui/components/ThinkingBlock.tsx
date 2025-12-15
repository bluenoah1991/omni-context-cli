import { Box, Text } from 'ink';
import React from 'react';

interface ThinkingBlockProps {
  content: string;
  isStreaming?: boolean;
}

export function ThinkingBlock({content, isStreaming}: ThinkingBlockProps): React.ReactElement {
  const lines = content.split('\n');
  const displayLines = lines.slice(-10);
  const truncated = lines.length > 10;

  return (
    <Box flexDirection='column' borderStyle='round' borderColor='gray' paddingX={1} marginY={1}>
      <Box>
        <Text color='gray' dimColor>{'💭 Thinking'} {isStreaming ? '...' : ''}</Text>
      </Box>
      <Box flexDirection='column' marginTop={1}>
        {truncated && <Text color='gray' dimColor>{'...(truncated)'}</Text>}
        {displayLines.map((line, i) => <Text key={i} color='gray' dimColor wrap='wrap'>{line}
        </Text>)}
      </Box>
    </Box>
  );
}
