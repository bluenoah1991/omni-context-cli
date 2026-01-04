import { Box, Text, useInput } from 'ink';
import React, { useMemo } from 'react';
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
  maxVisible?: number;
}

export function SelectList(
  {
    title,
    items,
    selectedIndex,
    onSelect,
    onConfirm,
    onCancel,
    emptyMessage = 'No items',
    maxVisible,
  }: SelectListProps,
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

  const visibleItems = useMemo(() => {
    if (!maxVisible || items.length <= maxVisible) {
      return {list: items, startIndex: 0};
    }
    let start = selectedIndex - Math.floor(maxVisible / 2);
    if (start < 0) start = 0;
    if (start + maxVisible > items.length) start = items.length - maxVisible;
    return {list: items.slice(start, start + maxVisible), startIndex: start};
  }, [items, selectedIndex, maxVisible]);

  return (
    <Box flexDirection='column'>
      <Box marginBottom={1}>
        <Text color={colors.primary} bold>{title}</Text>
      </Box>
      {items.length === 0
        ? <Text color={colors.muted}>{emptyMessage}</Text>
        : visibleItems.list.map((item, i) => {
          const actualIndex = visibleItems.startIndex + i;
          return (
            <Box key={item.id}>
              <Text color={actualIndex === selectedIndex ? colors.primary : colors.muted}>
                {actualIndex === selectedIndex ? '❯ ' : '  '}
                {item.label}
                {item.hint && <Text color={colors.muted}>{item.hint}</Text>}
              </Text>
            </Box>
          );
        })}
      <Box marginTop={1}>
        <Text color={colors.muted}>(Enter to confirm, ESC to go back)</Text>
      </Box>
    </Box>
  );
}
