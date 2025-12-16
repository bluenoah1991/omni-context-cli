import { Box, Text, useApp, useInput } from 'ink';
import React, { useState } from 'react';
import { AppConfig } from '../../types/config';
import { Session } from '../../types/session';
import { colors } from '../theme/colors';

interface StatusBarProps {
  isLoading: boolean;
  onInterrupt?: () => void;
  onOpenMenu?: () => void;
  config: AppConfig;
  session?: Session;
}

export function StatusBar(
  {isLoading, onInterrupt, onOpenMenu, config, session}: StatusBarProps,
): React.ReactElement {
  const [ctrlCPressed, setCtrlCPressed] = useState(false);
  const {exit} = useApp();

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      if (ctrlCPressed) {
        exit();
      } else {
        setCtrlCPressed(true);
        setTimeout(() => setCtrlCPressed(false), 2000);
      }
    }

    if (key.escape) {
      if (isLoading && onInterrupt) {
        onInterrupt();
      } else if (!isLoading && onOpenMenu) {
        onOpenMenu();
      }
    }
  });

  const nickname = config.nickname || config.model || 'Not Set';
  const thinking = config.enableThinking ? 'ON' : 'OFF';
  const contextLimit = (config.contextSize ?? 200) * 1024;
  const inputTokens = session?.inputTokens ?? 0;
  const outputTokens = session?.outputTokens ?? 0;
  const cachedTokens = session?.cachedTokens ?? 0;
  const totalTokens = inputTokens + outputTokens;

  return (
    <Box flexGrow={1} justifyContent='space-between'>
      <Text color={colors.muted}>
        {ctrlCPressed
          ? '(Press Ctrl+C again to exit)'
          : `| ${nickname} | Thinking: ${thinking} | Tokens: ${totalTokens}/${contextLimit} (In: ${inputTokens}, Out: ${outputTokens}, Cache: ${cachedTokens}) |`}
      </Text>
      <Text color={colors.muted}>
        {isLoading ? '(Press ESC to interrupt)' : '(Press ESC to enter the menu)'}
      </Text>
    </Box>
  );
}
