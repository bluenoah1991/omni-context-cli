import { Box, Text } from 'ink';
import React from 'react';
import { useContentWidth } from '../hooks';

interface ToolCallBlockProps {
  toolName: string;
  content: string;
  isResult?: boolean;
}

function formatReadCall(args: Record<string, unknown>): string {
  return String(args.filePath || '');
}

function formatReadResult(result: any): string {
  if (result.lines !== undefined) {
    return `Got ${result.lines} lines of output`;
  }
  return 'Successfully read file';
}

function formatToolCall(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case 'read':
      return formatReadCall(args);
    default:
      return Object.values(args).map(v => String(v)).join(' ');
  }
}

function formatToolResult(toolName: string, data: any): string {
  if (!data.success || !data.result) {
    return 'Tool completed successfully';
  }
  switch (toolName) {
    case 'read':
      return formatReadResult(data.result);
    default:
      return 'Tool completed successfully';
  }
}

export function ToolCallBlock(
  {toolName, content, isResult}: ToolCallBlockProps,
): React.ReactElement {
  const contentWidth = useContentWidth();
  let text = '';
  let color: 'gray' | 'red' = 'gray';

  let data;
  try {
    data = JSON.parse(content);
  } catch {
    text = isResult ? content : `${toolName}: ${content}`;
    return (
      <Box marginBottom={isResult ? 1 : 0}>
        <Box marginRight={1}>
          <Text color='gray'>{' '}</Text>
        </Box>
        <Box marginRight={3} flexDirection='column' width={contentWidth}>
          <Text color={color} wrap='wrap'>{text}</Text>
        </Box>
      </Box>
    );
  }

  if (!isResult) {
    text = `${toolName}: ${formatToolCall(toolName, data)}`;
  } else if (data.error) {
    text = data.error;
    color = 'red';
  } else {
    text = formatToolResult(toolName, data);
  }

  return (
    <Box marginBottom={isResult ? 1 : 0}>
      <Box marginRight={1}>
        <Text color='gray'>{' '}</Text>
      </Box>
      <Box marginRight={3} flexDirection='column' width={contentWidth}>
        <Text color={color} wrap='wrap'>{text}</Text>
      </Box>
    </Box>
  );
}
