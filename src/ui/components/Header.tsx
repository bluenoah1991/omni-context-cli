import figlet from 'figlet';
import { Box, Text } from 'ink';
import path from 'node:path';
import React from 'react';
import packageJson from '../../../package.json';
import { colors } from '../theme/colors';

interface HeaderProps {
  sessionId: string;
}

export const Header = React.memo(function Header({sessionId}: HeaderProps): React.ReactElement {
  const line1 = figlet.textSync('Omni ', {font: 'Calvin S'});
  const line2 = figlet.textSync('Context CLI', {font: 'Calvin S'});
  const cwdName = path.basename(process.cwd());
  const separatorLength = 80;
  const separator = '─'.repeat(separatorLength);

  return (
    <Box flexDirection='column' marginY={1}>
      <Box flexDirection='row'>
        <Text color={colors.primary}>{line1}</Text>
        <Text color={colors.text}>{line2}</Text>
      </Box>
      <Box flexDirection='column' marginTop={1}>
        <Text color={colors.muted}>▸ Version: {packageJson.version}</Text>
        <Text color={colors.muted}>▸ Project: {cwdName}</Text>
        <Text color={colors.muted}>▸ Session: {sessionId}</Text>
        <Text color={colors.muted} dimColor>{separator}</Text>
      </Box>
    </Box>
  );
});
