import { Box, Text } from 'ink';
import React from 'react';
import { useContentWidth } from '../hooks';
import { colors } from '../theme/colors';

interface ToolCallBlockProps {
  toolName: string;
  content: string;
  isResult?: boolean;
}

function formatShellCall(args: Record<string, unknown>): string {
  return String(args.cmd || '');
}

function formatShellResult(result: any): string {
  if (result.content) {
    const lines = result.content.split('\n').length;
    return `Command executed (${lines} lines of output)`;
  }
  return 'Command executed successfully';
}

function formatCreateCall(args: Record<string, unknown>): string {
  return String(args.filePath || '');
}

function formatCreateResult(result: any): string {
  if (result.lines !== undefined) {
    return `Created file with ${result.lines} lines`;
  }
  return 'File created successfully';
}

function formatEditCall(args: Record<string, unknown>): string {
  return String(args.filePath || '');
}

function formatEditResult(): string {
  return 'File edited successfully';
}

function formatListCall(args: Record<string, unknown>): string {
  return String(args.dirPath || '.');
}

function formatListResult(result: any): string {
  if (result.content) {
    const entries = result.content.split('\n').length;
    return `Listed ${entries} entries`;
  }
  return 'Directory listed successfully';
}

function formatPrependCall(args: Record<string, unknown>): string {
  return String(args.filePath || '');
}

function formatPrependResult(): string {
  return 'Text prepended successfully';
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

function formatRewriteCall(args: Record<string, unknown>): string {
  return String(args.filePath || '');
}

function formatRewriteResult(): string {
  return 'File rewritten successfully';
}

function formatToolCall(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case 'shell':
      return formatShellCall(args);
    case 'create':
      return formatCreateCall(args);
    case 'edit':
      return formatEditCall(args);
    case 'list':
      return formatListCall(args);
    case 'prepend':
      return formatPrependCall(args);
    case 'read':
      return formatReadCall(args);
    case 'rewrite':
      return formatRewriteCall(args);
    default:
      return Object.values(args).map(v => String(v)).join(' ');
  }
}

function formatToolResult(toolName: string, data: any): string {
  if (!data.success || !data.result) {
    return 'Tool completed successfully';
  }
  switch (toolName) {
    case 'shell':
      return formatShellResult(data.result);
    case 'create':
      return formatCreateResult(data.result);
    case 'edit':
      return formatEditResult();
    case 'list':
      return formatListResult(data.result);
    case 'prepend':
      return formatPrependResult();
    case 'read':
      return formatReadResult(data.result);
    case 'rewrite':
      return formatRewriteResult();
    default:
      return 'Tool completed successfully';
  }
}

export function ToolCallBlock(
  {toolName, content, isResult}: ToolCallBlockProps,
): React.ReactElement {
  const contentWidth = useContentWidth();
  let text = '';
  let textColor: string = colors.secondary;

  let data;
  try {
    data = JSON.parse(content);
  } catch {
    text = isResult ? content : `${toolName}: ${content}`;
    return (
      <Box marginBottom={isResult ? 1 : 0}>
        <Box marginRight={1}>
          <Text color={colors.secondary}>{' '}</Text>
        </Box>
        <Box marginRight={3} flexDirection='column' width={contentWidth}>
          <Text color={textColor} wrap='wrap'>{text}</Text>
        </Box>
      </Box>
    );
  }

  if (!isResult) {
    text = `${toolName}: ${formatToolCall(toolName, data)}`;
  } else if (data.error) {
    text = data.error;
    textColor = colors.error;
  } else {
    text = formatToolResult(toolName, data);
  }

  return (
    <Box marginBottom={isResult ? 1 : 0}>
      <Box marginRight={1}>
        <Text color={colors.secondary}>{' '}</Text>
      </Box>
      <Box marginRight={3} flexDirection='column' width={contentWidth}>
        <Text color={textColor} wrap='wrap'>{text}</Text>
      </Box>
    </Box>
  );
}
