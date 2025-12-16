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
  const nickname = config.nickname || config.model || 'default';
  const thinking = config.enableThinking ? 'ON' : 'OFF';

  return (
    <Box flexDirection='column' marginBottom={1}>
      <Text color={colors.primary}>{line1}</Text>
      <Text color={colors.text}>{line2}</Text>
      <Box marginTop={1}>
        <Text color={colors.muted}>
          {nickname} | Thinking: {thinking} | API Type: {config.provider} | Model:{' '}
          {config.model || 'not set'} | API Key: {masked}
        </Text>
      </Box>
    </Box>
  );
}
