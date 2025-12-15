import { Box, Text, useApp, useInput } from 'ink';
import React, { useState } from 'react';
import { colors } from '../theme/colors';

interface MenuProps {
  onClose: () => void;
}

const menuItems = [{id: 'resume', label: 'Resume'}, {id: 'exit', label: 'Exit'}];

export function Menu({onClose}: MenuProps): React.ReactElement {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const {exit} = useApp();

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(i => (i > 0 ? i - 1 : menuItems.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex(i => (i < menuItems.length - 1 ? i + 1 : 0));
    } else if (key.return) {
      const item = menuItems[selectedIndex];
      if (item.id === 'exit') {
        exit();
      } else if (item.id === 'resume') {
        onClose();
      }
    }
  });

  return (
    <Box
      flexDirection='column'
      borderStyle='round'
      borderColor={colors.primary}
      paddingX={2}
      paddingY={1}
    >
      <Box marginBottom={1}>
        <Text color={colors.primary} bold>Menu</Text>
      </Box>
      {menuItems.map((item, index) => (
        <Box key={item.id}>
          <Text color={index === selectedIndex ? colors.primary : colors.text.dimmed}>
            {index === selectedIndex ? '❯ ' : '  '}
            {item.label}
          </Text>
        </Box>
      ))}
      <Box marginTop={1}>
        <Text color={colors.text.dimmed}>(ESC to close)</Text>
      </Box>
    </Box>
  );
}
