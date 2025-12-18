import { Box, Text } from 'ink';
import React from 'react';
import { useContentWidth } from '../hooks/useContentWidth';
import { colors } from '../theme/colors';

interface ToolCallBlockProps {
  toolName: string;
  content: string;
  result?: string;
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

function formatBatchCall(args: Record<string, unknown>): string {
  const calls = (args.tool_calls as any[]) || [];
  return `Executing ${calls.length} tools in parallel`;
}

function formatBatchResult(result: any): string {
  if (result.summary) {
    return `${result.summary.successful}/${result.summary.totalCalls} tools succeeded`;
  }
  return 'Batch execution completed';
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
    const lines = result.content.split('\n').filter((l: string) => l.trim()).length;
    return `Found ${lines} files`;
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

function formatMultiEditCall(args: Record<string, unknown>): string {
  const filePath = String(args.filePath || '');
  const edits = (args.edits as any[]) || [];
  return `${filePath} (${edits.length} edits)`;
}

function formatMultiEditResult(result: any): string {
  if (result.content) {
    return result.content;
  }
  return 'Multiple edits applied successfully';
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

function formatTodoReadCall(): string {
  return 'Reading todos';
}

function formatTodoReadResult(result: any): string {
  if (result.todos) {
    const active = result.todos.filter((t: any) => t.status !== 'completed').length;
    return `${active} active todos`;
  }
  return 'Todos retrieved';
}

function formatTodoWriteCall(args: Record<string, unknown>): string {
  const todos = (args.todos as any[]) || [];
  return `Updating ${todos.length} todos`;
}

function formatTodoWriteResult(result: any): string {
  if (result.content) {
    return result.content;
  }
  return 'Todos updated successfully';
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
    case 'batch':
      return formatBatchCall(args);
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
    case 'multiedit':
      return formatMultiEditCall(args);
    case 'prepend':
      return formatPrependCall(args);
    case 'read':
      return formatReadCall(args);
    case 'rewrite':
      return formatRewriteCall(args);
    case 'shell':
      return formatShellCall(args);
    case 'todoread':
      return formatTodoReadCall();
    case 'todowrite':
      return formatTodoWriteCall(args);
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
    case 'batch':
      return formatBatchResult(data.result);
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
    case 'multiedit':
      return formatMultiEditResult(data.result);
    case 'prepend':
      return formatPrependResult();
    case 'read':
      return formatReadResult(data.result);
    case 'rewrite':
      return formatRewriteResult();
    case 'shell':
      return formatShellResult(data.result);
    case 'todoread':
      return formatTodoReadResult(data.result);
    case 'todowrite':
      return formatTodoWriteResult(data.result);
    case 'write':
      return formatWriteResult();
    default:
      return 'Tool completed successfully';
  }
}

export const ToolCallBlock = React.memo(
  function ToolCallBlock({toolName, content, result}: ToolCallBlockProps): React.ReactElement {
    const contentWidth = useContentWidth();
    let callText = '';

    try {
      const data = JSON.parse(content);
      callText = `${toolName}: ${formatToolCall(toolName, data)}`;
    } catch {
      callText = `${toolName}: ${content}`;
    }

    let resultText = '';
    let resultColor: string = colors.secondary;

    if (result) {
      try {
        const resultData = JSON.parse(result);
        if (resultData.error) {
          resultText = resultData.error;
          resultColor = colors.error;
        } else {
          resultText = formatToolResult(toolName, resultData);
        }
      } catch {
        resultText = result;
      }
    }

    return (
      <Box marginBottom={1} flexDirection='column'>
        <Box>
          <Box marginRight={1}>
            <Text color={colors.secondary}>{' '}</Text>
          </Box>
          <Box marginRight={3} flexDirection='column' width={contentWidth}>
            <Text color={colors.secondary} wrap='wrap'>{callText}</Text>
          </Box>
        </Box>
        {result && (
          <Box>
            <Box marginRight={1}>
              <Text color={colors.secondary}>{' '}</Text>
            </Box>
            <Box marginRight={3} flexDirection='column' width={contentWidth}>
              <Text color={resultColor} wrap='wrap'>{resultText}</Text>
            </Box>
          </Box>
        )}
      </Box>
    );
  },
);
