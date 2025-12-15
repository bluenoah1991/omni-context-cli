import figlet from 'figlet';
import { Box, Text } from 'ink';
import React from 'react';
import { getConfigDisplay } from '../../services/appConfig';
import { AppConfig } from '../../types/config';
import { colors } from '../theme/colors';

interface HeaderProps {
  config: AppConfig;
}

export function Header({config}: HeaderProps): React.ReactElement {
  const line1 = figlet.textSync('Omni', {font: 'ANSI Shadow'});
  const line2 = figlet.textSync('Context CLI', {font: 'ANSI Shadow'});

  return (
    <Box flexDirection='column' marginBottom={1}>
      <Text color={colors.secondary}>{line1}</Text>
      <Text color={colors.secondary}>{line2}</Text>
      <Box marginTop={1}>
        <Text color={colors.text.dimmed}>{getConfigDisplay(config)}</Text>
      </Box>
    </Box>
  );
}
