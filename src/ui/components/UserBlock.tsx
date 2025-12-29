import { Box, Text } from 'ink';
import React from 'react';
import { useContentWidth } from '../hooks/useContentWidth';
import { colors } from '../theme/colors';

interface UserBlockProps {
  content: string;
}

function removeIDEContext(content: string): string {
  return content.replace(/<ide_context[^>]*>.*?<\/ide_context>/gs, '').replace(
    /<ide_context[^>]*\/>/g,
    '',
  ).trim();
}

export const UserBlock = React.memo(
  function UserBlock({content}: UserBlockProps): React.ReactElement {
    const contentWidth = useContentWidth();
    const displayContent = removeIDEContext(content);

    return (
      <Box marginBottom={1}>
        <Box marginRight={1}>
          <Text color={colors.primary} bold>{'❯'}</Text>
        </Box>
        <Box marginRight={3} flexDirection='column' width={contentWidth}>
          <Text color={colors.text} wrap='wrap'>{displayContent}</Text>
        </Box>
      </Box>
    );
  },
);
