import figlet from 'figlet';
import { Box, Text } from 'ink';
import React from 'react';
import packageJson from '../../../package.json';
import { colors } from '../theme/colors';

export function Header(): React.ReactElement {
  const line1 = figlet.textSync('Omni', {font: 'ANSI Shadow'});
  const line2 = figlet.textSync('Context CLI', {font: 'ANSI Shadow'});

  return (
    <Box flexDirection='column' marginBottom={2}>
      <Text color={colors.primary}>{line1}</Text>
      <Text color={colors.text}>{line2}</Text>
      <Box marginTop={1}>
        <Text color={colors.muted}>
          Version: {packageJson.version} | A small, helpful, zero-telemetry coding assistant
        </Text>
      </Box>
    </Box>
  );
}
