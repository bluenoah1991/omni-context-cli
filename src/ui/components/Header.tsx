import figlet from 'figlet';
import { Box, Text } from 'ink';
import React from 'react';
import { getConfigDisplay } from '../../services/appConfig';
import { AppConfig } from '../../types/config';

interface HeaderProps {
  config: AppConfig;
}

export function Header({config}: HeaderProps): React.ReactElement {
  const line1 = figlet.textSync('Omni', {font: 'ANSI Shadow'});
  const line2 = figlet.textSync('Context CLI', {font: 'ANSI Shadow'});

  return (
    <Box flexDirection='column' marginBottom={1}>
      <Text color='cyan'>{line1}</Text>
      <Text color='cyan'>{line2}</Text>
      <Box marginTop={1}>
        <Text color='gray'>{getConfigDisplay(config)}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color='gray' dimColor>Press Ctrl+C to exit | Ctrl+L to clear</Text>
      </Box>
    </Box>
  );
}
