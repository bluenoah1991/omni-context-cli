import { Box, Text, useInput } from 'ink';
import React, { useEffect, useState } from 'react';
import { colors } from '../theme/colors';

interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  mask?: boolean;
  placeholder?: string;
}

export function TextInput(
  {label, value, onChange, onSubmit, onCancel, mask = false, placeholder = ''}: TextInputProps,
): React.ReactElement {
  const [cursorOffset, setCursorOffset] = useState(0);

  useEffect(() => {
    setCursorOffset(prev => prev > value.length ? value.length : prev);
  }, [value]);

  useInput((input, key) => {
    if (key.escape) {
      onCancel?.();
      return;
    }
    if (key.return) {
      onSubmit();
      return;
    }
    if (key.leftArrow) {
      setCursorOffset(Math.max(0, cursorOffset - 1));
    } else if (key.rightArrow) {
      setCursorOffset(Math.min(value.length, cursorOffset + 1));
    } else if (key.backspace || (key.delete && process.platform !== 'win32')) {
      if (cursorOffset > 0) {
        onChange(value.slice(0, cursorOffset - 1) + value.slice(cursorOffset));
        setCursorOffset(cursorOffset - 1);
      }
    } else if (key.delete) {
      onChange(value.slice(0, cursorOffset) + value.slice(cursorOffset + 1));
    } else if (input && !key.ctrl && !key.meta) {
      onChange(value.slice(0, cursorOffset) + input + value.slice(cursorOffset));
      setCursorOffset(cursorOffset + input.length);
    }
  }, {isActive: true});

  const displayValue = mask && value ? '*'.repeat(value.length) : value;
  const showPlaceholder = !value && placeholder;

  return (
    <Box flexDirection='column'>
      <Box marginBottom={1}>
        <Text color={colors.primary} bold>{label}</Text>
      </Box>
      <Box>
        <Text color={colors.primary}>{'❯ '}</Text>
        {showPlaceholder ? <Text color={colors.muted}>{placeholder}</Text> : (
          <>
            <Text>{displayValue.slice(0, cursorOffset)}</Text>
            <Text inverse>{displayValue[cursorOffset] || ' '}</Text>
            <Text>{displayValue.slice(cursorOffset + 1)}</Text>
          </>
        )}
      </Box>
      <Box marginTop={1}>
        <Text color={colors.muted}>(Enter to continue, ESC to cancel)</Text>
      </Box>
    </Box>
  );
}
