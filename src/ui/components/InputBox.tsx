import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';

interface InputBoxProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function InputBox(
  {onSubmit, disabled, placeholder = 'Type your message...'}: InputBoxProps,
): React.ReactElement {
  const [value, setValue] = useState('');

  useInput((input, key) => {
    if (disabled) return;

    if (key.return) {
      if (value.trim()) {
        onSubmit(value.trim());
        setValue('');
      }
      return;
    }

    if (key.backspace || key.delete) {
      setValue(prev => prev.slice(0, -1));
      return;
    }

    if (key.ctrl && input === 'c') {
      process.exit(0);
    }

    if (key.ctrl && input === 'l') {
      console.clear();
      return;
    }

    if (!key.ctrl && !key.meta && input) {
      setValue(prev => prev + input);
    }
  });

  return (
    <Box borderStyle='round' borderColor={disabled ? 'gray' : 'green'} paddingX={1}>
      <Box marginRight={1}>
        <Text color={disabled ? 'gray' : 'green'} bold>{'❯'}</Text>
      </Box>
      <Box flexGrow={1}>
        {value ? <Text>{value}</Text> : <Text color='gray'>{placeholder}</Text>}
        {!disabled && <Text color='green'>{'▌'}</Text>}
      </Box>
    </Box>
  );
}
