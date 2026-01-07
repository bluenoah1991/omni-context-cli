import { Box, Text, useApp, useInput } from 'ink';
import React, { useState } from 'react';
import { ModelConfig } from '../../types/config';
import { Session } from '../../types/session';
import { colors } from '../theme/colors';

interface StatusBarProps {
  isLoading: boolean;
  onInterrupt?: () => void;
  onOpenMenu?: () => void;
  model: ModelConfig | undefined;
  session?: Session;
  enableThinking: boolean;
  disabled?: boolean;
}

export function StatusBar(
  {isLoading, onInterrupt, onOpenMenu, model, session, enableThinking, disabled = false}:
    StatusBarProps,
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
  }, {isActive: !disabled});

  const nickname = model?.nickname || model?.name || 'Not Set';
  const thinkingText = enableThinking ? ' (Thinking)' : '';
  const contextLimit = (model?.contextSize || 200) * 1024;
  const inputTokens = session?.inputTokens ?? 0;
  const outputTokens = session?.outputTokens ?? 0;
  const cachedTokens = session?.cachedTokens ?? 0;
  const totalTokens = inputTokens + outputTokens;
  const contextPercent = ((totalTokens / contextLimit) * 100).toFixed(1);

  return (
    <Box flexGrow={1} justifyContent='space-between' marginTop={1}>
      <Text color={colors.muted}>
        {ctrlCPressed
          ? '(Press Ctrl+C again to exit)'
          : `${nickname}${thinkingText} | ${contextPercent}% (⇈ ${inputTokens} ⇊ ${outputTokens} ↺ ${cachedTokens})`}
      </Text>
      <Text color={colors.muted}>
        {isLoading ? '(Press ESC to interrupt)' : '(Press ESC to enter the menu)'}
      </Text>
    </Box>
  );
}
