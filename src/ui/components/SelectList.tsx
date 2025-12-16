import { Box, Text, useInput } from 'ink';
import React from 'react';
import { colors } from '../theme/colors';

export interface SelectItem {
  id: string;
  label: string;
  hint?: string;
}

interface SelectListProps {
  title: string;
  items: SelectItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onConfirm: (index: number) => void;
  onCancel: () => void;
  emptyMessage?: string;
}

export function SelectList(
  {title, items, selectedIndex, onSelect, onConfirm, onCancel, emptyMessage = 'No items'}:
    SelectListProps,
): React.ReactElement {
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (items.length === 0) return;
    if (key.upArrow) {
      onSelect(selectedIndex > 0 ? selectedIndex - 1 : items.length - 1);
    } else if (key.downArrow) {
      onSelect(selectedIndex < items.length - 1 ? selectedIndex + 1 : 0);
    } else if (key.return) {
      onConfirm(selectedIndex);
    }
  }, {isActive: true});

  return (
    <Box flexDirection='column'>
      <Box marginBottom={1}>
        <Text color={colors.primary} bold>{title}</Text>
      </Box>
      {items.length === 0
        ? <Text color={colors.text.dimmed}>{emptyMessage}</Text>
        : items.map((item, index) => (
          <Box key={item.id}>
            <Text color={index === selectedIndex ? colors.primary : colors.text.dimmed}>
              {index === selectedIndex ? '❯ ' : '  '}
              {item.label}
              {item.hint && <Text color={colors.text.dimmed}>{item.hint}</Text>}
            </Text>
          </Box>
        ))}
      <Box marginTop={1}>
        <Text color={colors.text.dimmed}>(Enter to confirm, ESC to go back)</Text>
      </Box>
    </Box>
  );
}
