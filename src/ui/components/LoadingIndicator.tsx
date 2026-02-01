import { Text } from 'ink';
import React, { useEffect, useState } from 'react';
import { WorkflowPreset } from '../../types/config';
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

const artistVerbs = [
  'Painting',
  'Sketching',
  'Imagining',
  'Composing',
  'Rendering',
  'Sculpting',
  'Illustrating',
  'Envisioning',
  'Designing',
  'Creating',
];

const getRandomText = (verbs: string[]) => verbs[Math.floor(Math.random() * verbs.length)];

interface LoadingIndicatorProps {
  workflowPreset?: WorkflowPreset;
}

export function LoadingIndicator(
  {workflowPreset = 'normal'}: LoadingIndicatorProps,
): React.ReactElement {
  const verbList = workflowPreset === 'artist' ? artistVerbs : verbs;
  const [text, setText] = useState(() => getRandomText(verbList));

  useEffect(() => {
    const interval = setInterval(() => {
      setText(getRandomText(verbList));
    }, 2000);

    return () => clearInterval(interval);
  }, [verbList]);

  return (
    <>
      <Text color={colors.primary}>
        <Spinner type='dots' />
        {' '}
      </Text>
      {workflowPreset !== 'normal'
        ? <ShimmerText text={text + '...'} />
        : <Text color={colors.muted}>{text}...</Text>}
    </>
  );
}
