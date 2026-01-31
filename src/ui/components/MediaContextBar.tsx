import { Text, useStdout } from 'ink';
import React from 'react';
import { MediaContext } from '../../store/chatStore';
import { isDocumentMimeType } from '../../utils/mediaUtils';
import { colors } from '../theme/colors';

interface MediaContextBarProps {
  mediaContexts: MediaContext[];
}

export function MediaContextBar({mediaContexts}: MediaContextBarProps): React.ReactElement | null {
  const {stdout} = useStdout();
  const maxWidth = Math.floor((stdout?.columns ?? 80) * 0.6);

  if (mediaContexts.length === 0) {
    return null;
  }

  const items = mediaContexts.map(m => {
    const icon = isDocumentMimeType(m.mimeType) ? '▤' : '▣';
    return icon + ' ' + m.fileName;
  }).join('  ');
  const display = items.length > maxWidth ? items.slice(0, maxWidth - 3) + '...' : items;
  return <Text color={colors.warning} dimColor wrap='truncate'>{display}</Text>;
}
