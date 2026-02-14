import { Box, Text } from 'ink';
import React from 'react';
import {
  removeFileContext,
  removeIDEContext,
  unwrapUIMessage,
} from '../../utils/messagePreprocessor';
import { useContentWidth } from '../hooks/useContentWidth';
import { colors } from '../theme/colors';

interface UserBlockProps {
  content: string;
}

export const UserBlock = React.memo(
  function UserBlock({content}: UserBlockProps): React.ReactElement {
    const contentWidth = useContentWidth();
    let displayContent = unwrapUIMessage(content);
    displayContent = removeIDEContext(displayContent);
    displayContent = removeFileContext(displayContent);

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
