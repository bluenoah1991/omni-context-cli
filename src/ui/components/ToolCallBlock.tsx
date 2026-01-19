import { Box, Text } from 'ink';
import React from 'react';
import { formatToolCall } from '../../services/toolExecutor';
import { useContentWidth } from '../hooks/useContentWidth';
import { colors } from '../theme/colors';

interface ToolCallBlockProps {
  type: 'call' | 'result';
  toolName: string;
  content: string;
}

export const ToolCallBlock = React.memo(
  function ToolCallBlock({type, toolName, content}: ToolCallBlockProps): React.ReactElement {
    const contentWidth = useContentWidth();

    let text = '';
    let textColor: string = colors.secondary;

    if (type === 'call') {
      try {
        const data = JSON.parse(content);
        const formattedCall = formatToolCall(toolName, data);
        const capitalizedName = toolName.charAt(0).toUpperCase() + toolName.slice(1);
        text = `${capitalizedName}: ${formattedCall}`;
      } catch {
        text = toolName.charAt(0).toUpperCase() + toolName.slice(1);
      }
    } else {
      try {
        const resultData = JSON.parse(content);
        if (resultData.error) {
          text = resultData.error;
          textColor = colors.error;
        } else {
          text = resultData.displayText || 'Tool completed successfully';
        }
      } catch {
        text = content;
      }
    }

    return (
      <Box marginTop={type === 'call' ? 0 : -1} marginBottom={1}>
        <Box marginRight={1}>
          <Text color={colors.secondary}>{type === 'call' ? '◈' : ' '}</Text>
        </Box>
        <Box marginRight={3} flexDirection='column' width={contentWidth}>
          <Text color={textColor} wrap='wrap'>{text}</Text>
        </Box>
      </Box>
    );
  },
);
