import figlet from 'figlet';
import { Box, Text } from 'ink';
import React from 'react';
import { AppConfig } from '../../types/config';
import { colors } from '../theme/colors';

interface HeaderProps {
  config: AppConfig;
}

export function Header({config}: HeaderProps): React.ReactElement {
  const line1 = figlet.textSync('Omni', {font: 'ANSI Shadow'});
  const line2 = figlet.textSync('Context CLI', {font: 'ANSI Shadow'});

  const masked = config.apiKey ? '****' + config.apiKey.slice(-4) : 'not set';
  const configDisplay = `Provider: ${config.provider} | Model: ${
    config.model || 'not set'
  } | API Key: ${masked}`;

  return (
    <Box flexDirection='column' marginBottom={1}>
      <Text color={colors.secondary}>{line1}</Text>
      <Text color={colors.secondary}>{line2}</Text>
      <Box marginTop={1}>
        <Text color={colors.text.dimmed}>{configDisplay}</Text>
      </Box>
    </Box>
  );
}
