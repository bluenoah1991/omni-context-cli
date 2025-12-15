import { Text, useApp, useInput } from 'ink';
import React, { useState } from 'react';
import { colors } from '../theme/colors';

export function ExitPrompt(): React.ReactElement {
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
  });

  return (
    <Text color={colors.text.dimmed}>{ctrlCPressed ? '(Press Ctrl+C again to exit)' : ''}</Text>
  );
}
