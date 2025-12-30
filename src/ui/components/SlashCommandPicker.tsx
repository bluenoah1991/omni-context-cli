import { Box, Text, useInput } from 'ink';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SlashCommand } from '../../types/slash';
import { colors } from '../theme/colors';

const MAX_VISIBLE = 5;

interface SlashCommandPickerProps {
  commands: SlashCommand[];
  onSelectCommand?: (commandName: string) => void;
  onCancel?: () => void;
}

export const SlashCommandPicker: React.FC<SlashCommandPickerProps> = (
  {commands, onSelectCommand, onCancel},
) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (selectedIndex >= commands.length) {
      setSelectedIndex(0);
    }
  }, [commands.length, selectedIndex]);

  const handleSelect = useCallback((index: number) => {
    if (commands[index] && onSelectCommand) {
      onSelectCommand(commands[index].name);
    }
  }, [commands, onSelectCommand]);

  useInput((input, key) => {
    if (commands.length === 0) return;

    if (key.escape) {
      if (onCancel) onCancel();
      return;
    }

    if (key.upArrow) {
      const newIndex = selectedIndex <= 0 ? commands.length - 1 : selectedIndex - 1;
      setSelectedIndex(newIndex);
    } else if (key.downArrow) {
      const newIndex = selectedIndex >= commands.length - 1 ? 0 : selectedIndex + 1;
      setSelectedIndex(newIndex);
    } else if (key.return || key.tab) {
      handleSelect(selectedIndex);
    }
  });

  const visibleCommands = useMemo(() => {
    if (commands.length <= MAX_VISIBLE) {
      return {items: commands, startIndex: 0};
    }
    let start = selectedIndex - Math.floor(MAX_VISIBLE / 2);
    if (start < 0) start = 0;
    if (start + MAX_VISIBLE > commands.length) start = commands.length - MAX_VISIBLE;
    return {items: commands.slice(start, start + MAX_VISIBLE), startIndex: start};
  }, [commands, selectedIndex]);

  if (commands.length === 0) {
    return null;
  }

  return (
    <Box flexDirection='column' paddingY={1}>
      {visibleCommands.items.map((cmd, i) => {
        const actualIndex = visibleCommands.startIndex + i;
        return (
          <Box paddingLeft={1} key={cmd.name}>
            <Text
              color={actualIndex === selectedIndex ? colors.secondary : colors.muted}
              bold={actualIndex === selectedIndex}
              dimColor={actualIndex !== selectedIndex}
            >
              {`/${cmd.name}${cmd.description ? ` - ${cmd.description}` : ''}`}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};
