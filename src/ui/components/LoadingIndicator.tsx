import { Box, Text } from 'ink';
import React, { useEffect, useState } from 'react';
import { colors } from '../theme/colors';
import { Spinner } from './Spinner';

const verbs = [
  'Conspiring',
  'Conjuring',
  'Meddling',
  'Tinkering',
  'Weaving',
  'Brewing',
  'Convoluting',
  'Obfuscating',
  'Transmuting',
  'Manifesting',
];

const getRandomText = () => verbs[Math.floor(Math.random() * verbs.length)];

export function LoadingIndicator(): React.ReactElement {
  const [text, setText] = useState(getRandomText);

  useEffect(() => {
    const interval = setInterval(() => {
      setText(getRandomText());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box>
      <Text color={colors.primary}>
        <Spinner type='dots' />
        {' '}
      </Text>
      <Text color={colors.muted}>{text}...</Text>
    </Box>
  );
}
