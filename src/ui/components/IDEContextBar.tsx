import { Text } from 'ink';
import path from 'node:path';
import React from 'react';
import { IDESelection } from '../../types/ide';
import { colors } from '../theme/colors';

interface IDEContextBarProps {
  selection: IDESelection | null;
}

export function IDEContextBar({selection}: IDEContextBarProps): React.ReactElement | null {
  if (!selection) {
    return null;
  }

  const fileName = path.basename(selection.filePath);
  let label: string;
  if (selection.lineStart === 0) {
    label = fileName;
  } else if (selection.lineStart === selection.lineEnd) {
    label = `${fileName}:${selection.lineStart}`;
  } else {
    label = `${fileName}:${selection.lineStart}-${selection.lineEnd}`;
  }

  return <Text color={colors.info} dimColor>{'⌘ '}{label}</Text>;
}
