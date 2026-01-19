import { Text } from 'ink';
import React from 'react';
import { colors } from '../theme/colors';
import { Spinner } from './Spinner';

export function CompactingIndicator(): React.ReactElement {
  return (
    <>
      <Text color={colors.primary}>
        <Spinner type='dots' />
        {' '}
      </Text>
      <Text color={colors.muted}>Compacting conversation history...</Text>
    </>
  );
}
