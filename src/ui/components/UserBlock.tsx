import { Box, Text } from 'ink';
import React from 'react';
import { useContentWidth } from '../hooks/useContentWidth';
import { colors } from '../theme/colors';

interface UserBlockProps {
  content: string;
}

export const UserBlock = React.memo(
  function UserBlock({content}: UserBlockProps): React.ReactElement {
    const contentWidth = useContentWidth();

    return (
      <Box marginBottom={1}>
        <Box marginRight={1}>
          <Text color={colors.primary} bold>{'❯'}</Text>
        </Box>
        <Box marginRight={3} flexDirection='column' width={contentWidth}>
          <Text color={colors.text} wrap='wrap'>{content}</Text>
        </Box>
      </Box>
    );
  },
);
