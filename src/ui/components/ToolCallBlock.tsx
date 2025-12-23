import { Box, Text } from 'ink';
import React from 'react';
import { useContentWidth } from '../hooks/useContentWidth';
import { colors } from '../theme/colors';

interface ToolCallBlockProps {
  type: 'call' | 'result';
  toolName: string;
  content: string;
}

function formatBashCall(args: Record<string, unknown>): string {
  return String(args.command || '');
}

function formatBashResult(result: any): string {
  if (result.content) {
    const lines = result.content.split('\n').length;
    return `Command executed (${lines} lines of output)`;
  }
  return 'Command executed successfully';
}

function formatBashOutputCall(args: Record<string, unknown>): string {
  return String(args.taskId || '');
}

function formatBashOutputResult(result: any): string {
  if (result.content) {
    return 'Task output retrieved';
  }
  return 'Task output retrieved successfully';
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

function formatGlobCall(args: Record<string, unknown>): string {
  return String(args.pattern || '');
}

function formatGlobResult(result: any): string {
  if (result.content) {
    const match = result.content.match(/Found (\d+) file\(s\)/);
    if (match) {
      return `Found ${match[1]} files`;
    }
  }
  return 'Pattern search completed';
}

function formatGrepCall(args: Record<string, unknown>): string {
  return String(args.pattern || '');
}

function formatGrepResult(result: any): string {
  if (result.content) {
    const matches = result.content.match(/Line \d+:/g)?.length || 0;
    return `Found ${matches} matches`;
  }
  return 'Content search completed';
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

function formatWriteCall(args: Record<string, unknown>): string {
  return String(args.filePath || '');
}

function formatWriteResult(): string {
  return 'File written successfully';
}

function formatToolCall(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case 'bash':
      return formatBashCall(args);
    case 'bashOutput':
      return formatBashOutputCall(args);
    case 'create':
      return formatCreateCall(args);
    case 'edit':
      return formatEditCall(args);
    case 'glob':
      return formatGlobCall(args);
    case 'grep':
      return formatGrepCall(args);
    case 'list':
      return formatListCall(args);
    case 'prepend':
      return formatPrependCall(args);
    case 'read':
      return formatReadCall(args);
    case 'rewrite':
      return formatRewriteCall(args);
    case 'write':
      return formatWriteCall(args);
    default:
      return Object.values(args).map(v => String(v)).join(' ');
  }
}

function formatToolResult(toolName: string, data: any): string {
  if (!data.success || !data.result) {
    return 'Tool completed successfully';
  }
  switch (toolName) {
    case 'bash':
      return formatBashResult(data.result);
    case 'bashOutput':
      return formatBashOutputResult(data.result);
    case 'create':
      return formatCreateResult(data.result);
    case 'edit':
      return formatEditResult();
    case 'glob':
      return formatGlobResult(data.result);
    case 'grep':
      return formatGrepResult(data.result);
    case 'list':
      return formatListResult(data.result);
    case 'prepend':
      return formatPrependResult();
    case 'read':
      return formatReadResult(data.result);
    case 'rewrite':
      return formatRewriteResult();
    case 'write':
      return formatWriteResult();
    default:
      return 'Tool completed successfully';
  }
}

export const ToolCallBlock = React.memo(
  function ToolCallBlock({type, toolName, content}: ToolCallBlockProps): React.ReactElement {
    const contentWidth = useContentWidth();

    let text = '';
    let textColor: string = colors.secondary;

    if (type === 'call') {
      try {
        const data = JSON.parse(content);
        text = `${toolName}: ${formatToolCall(toolName, data)}`;
      } catch {
        text = `${toolName}: ${content}`;
      }
    } else {
      try {
        const resultData = JSON.parse(content);
        if (resultData.error) {
          text = resultData.error;
          textColor = colors.error;
        } else {
          text = formatToolResult(toolName, resultData);
        }
      } catch {
        text = content;
      }
    }

    return (
      <Box marginTop={type === 'call' ? 0 : -1} marginBottom={1}>
        <Box marginRight={1}>
          <Text color={colors.secondary}>{' '}</Text>
        </Box>
        <Box marginRight={3} flexDirection='column' width={contentWidth}>
          <Text color={textColor} wrap='wrap'>{text}</Text>
        </Box>
      </Box>
    );
  },
);
