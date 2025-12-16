import { Box, Text, useApp, useInput } from 'ink';
import React, { useState } from 'react';
import { colors } from '../theme/colors';

interface KeyboardShortcutsProps {
  isLoading: boolean;
  onInterrupt?: () => void;
  onOpenMenu?: () => void;
}

export function KeyboardShortcuts(
  {isLoading, onInterrupt, onOpenMenu}: KeyboardShortcutsProps,
): React.ReactElement {
  const [ctrlCPressed, setCtrlCPressed] = useState(false);
  const {exit} = useApp();

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      if (ctrlCPressed) {
        exit();
      } else {
        setCtrlCPressed(true);
        setTimeout(() => setCtrlCPressed(false), 2000);
      }
    }

    if (key.escape) {
      if (isLoading && onInterrupt) {
        onInterrupt();
      } else if (!isLoading && onOpenMenu) {
        onOpenMenu();
      }
    }
  });

  return (
    <Box flexGrow={1} justifyContent='space-between'>
      <Text color={colors.muted}>{ctrlCPressed ? '(Press Ctrl+C again to exit)' : ''}</Text>
      <Text color={colors.muted}>
        {isLoading ? '(Press ESC to interrupt)' : '(Press ESC to enter the menu)'}
      </Text>
    </Box>
  );
}
