import { Text } from 'ink';
import React, { useEffect, useState } from 'react';
import { colors } from '../theme/colors';
import { ShimmerText } from './ShimmerText';
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

interface LoadingIndicatorProps {
  specialistMode?: boolean;
}

export function LoadingIndicator(
  {specialistMode = false}: LoadingIndicatorProps,
): React.ReactElement {
  const [text, setText] = useState(getRandomText);

  useEffect(() => {
    const interval = setInterval(() => {
      setText(getRandomText());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Text color={colors.primary}>
        <Spinner type='dots' />
        {' '}
      </Text>
      {specialistMode
        ? <ShimmerText text={text + '...'} />
        : <Text color={colors.muted}>{text}...</Text>}
    </>
  );
}
