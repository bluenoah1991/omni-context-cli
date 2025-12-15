import { Box, Text, useApp, useInput } from 'ink';
import React, { useState } from 'react';
import { colors } from '../theme/colors';

interface KeyboardShortcutsProps {
  isLoading: boolean;
  onInterrupt?: () => void;
}

export function KeyboardShortcuts(
  {isLoading, onInterrupt}: KeyboardShortcutsProps,
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

    if (key.escape && isLoading && onInterrupt) {
      onInterrupt();
    }
  });

  return (
    <Box flexGrow={1} justifyContent='space-between'>
      <Text color={colors.text.dimmed}>{ctrlCPressed ? '(Press Ctrl+C again to exit)' : ''}</Text>
      <Text color={colors.text.dimmed}>
        {isLoading ? '(Press ESC to interrupt)' : '(Press ESC to enter the menu)'}
      </Text>
    </Box>
  );
}
