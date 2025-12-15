import { Box, Text } from 'ink';
import React from 'react';

interface ToolCallBlockProps {
  toolName: string;
  content: string;
  isResult?: boolean;
}

export function ToolCallBlock(
  {toolName, content, isResult}: ToolCallBlockProps,
): React.ReactElement {
  const icon = isResult ? '📤' : '🔧';
  const label = isResult ? 'Tool Result' : 'Tool Call';
  const color = isResult ? 'green' : 'yellow';

  let displayContent = content;
  try {
    const parsed = JSON.parse(content);
    displayContent = JSON.stringify(parsed, null, 2);
  } catch {
    displayContent = content;
  }

  const lines = displayContent.split('\n');
  const maxLines = 5;
  const truncated = lines.length > maxLines;
  const displayLines = truncated ? lines.slice(0, maxLines) : lines;

  return (
    <Box flexDirection='column' borderStyle='single' borderColor={color} paddingX={1} marginY={1}>
      <Box>
        <Text color={color}>{icon} {label}: {toolName}</Text>
      </Box>
      <Box flexDirection='column' marginTop={1}>
        {displayLines.map((line, i) => <Text key={i} color='gray' wrap='truncate-end'>{line}
        </Text>)}
        {truncated && <Text color='gray' dimColor>{'...(truncated)'}</Text>}
      </Box>
    </Box>
  );
}
