import { Box, Text, useInput } from 'ink';
import React, { useCallback, useEffect, useState } from 'react';
import { colors } from '../theme/colors';

export interface OptionItem {
  key: string;
  label: string;
}

interface OptionPickerProps {
  title: string;
  options: OptionItem[];
  onSelect: (key: string) => void;
  onCancel?: () => void;
}

export const OptionPicker: React.FC<OptionPickerProps> = ({title, options, onSelect, onCancel}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (selectedIndex >= options.length) {
      setSelectedIndex(0);
    }
  }, [options.length, selectedIndex]);

  const handleSelect = useCallback((index: number) => {
    if (options[index]) {
      onSelect(options[index].key);
    }
  }, [options, onSelect]);

  useInput((input, key) => {
    if (options.length === 0) return;

    if (key.escape) {
      if (onCancel) onCancel();
      return;
    }

    if (key.upArrow) {
      const newIndex = selectedIndex <= 0 ? options.length - 1 : selectedIndex - 1;
      setSelectedIndex(newIndex);
    } else if (key.downArrow) {
      const newIndex = selectedIndex >= options.length - 1 ? 0 : selectedIndex + 1;
      setSelectedIndex(newIndex);
    } else if (key.return || key.tab) {
      handleSelect(selectedIndex);
    }
  });

  if (options.length === 0) {
    return null;
  }

  return (
    <Box flexDirection='column' paddingY={1}>
      <Box paddingLeft={1} marginBottom={1}>
        <Text color={colors.warning}>{title}</Text>
      </Box>
      {options.map((opt, i) => (
        <Box paddingLeft={1} key={opt.key}>
          <Text
            color={i === selectedIndex ? colors.secondary : colors.muted}
            bold={i === selectedIndex}
            dimColor={i !== selectedIndex}
          >
            {i === selectedIndex ? '❯ ' : '  '}
            {opt.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
};
