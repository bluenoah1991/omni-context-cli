import { Box, Text } from 'ink';
import React from 'react';

interface MarkdownTextProps {
  content: string;
}

function parseInlineStyles(text: string): React.ReactElement[] {
  const elements: React.ReactElement[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);

    let firstMatch:
      | {index: number; length: number; content: string; type: 'bold' | 'code';}
      | null = null;

    if (boldMatch && boldMatch.index !== undefined) {
      firstMatch = {
        index: boldMatch.index,
        length: boldMatch[0].length,
        content: boldMatch[1],
        type: 'bold',
      };
    }

    if (codeMatch && codeMatch.index !== undefined) {
      if (!firstMatch || codeMatch.index < firstMatch.index) {
        firstMatch = {
          index: codeMatch.index,
          length: codeMatch[0].length,
          content: codeMatch[1],
          type: 'code',
        };
      }
    }

    if (firstMatch) {
      if (firstMatch.index > 0) {
        elements.push(<Text key={key++}>{remaining.slice(0, firstMatch.index)}</Text>);
      }

      if (firstMatch.type === 'bold') {
        elements.push(<Text key={key++} bold>{firstMatch.content}</Text>);
      } else {
        elements.push(<Text key={key++} color='cyan'>{firstMatch.content}</Text>);
      }

      remaining = remaining.slice(firstMatch.index + firstMatch.length);
    } else {
      elements.push(<Text key={key++}>{remaining}</Text>);
      break;
    }
  }

  return elements;
}

export function MarkdownText({content}: MarkdownTextProps): React.ReactElement {
  const lines = content.split('\n');

  return (
    <Box flexDirection='column'>
      {lines.map((line, i) => {
        if (line.startsWith('# ')) {
          return <Text key={i} bold color='blue'>{line.slice(2)}</Text>;
        }
        if (line.startsWith('## ')) {
          return <Text key={i} bold color='cyan'>{line.slice(3)}</Text>;
        }
        if (line.startsWith('### ')) {
          return <Text key={i} bold>{line.slice(4)}</Text>;
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <Box key={i}>
              <Text color='gray'>{'  • '}</Text>
              <Text>{parseInlineStyles(line.slice(2))}</Text>
            </Box>
          );
        }
        if (/^\d+\.\s/.test(line)) {
          const match = line.match(/^(\d+)\.\s(.*)$/);
          if (match) {
            return (
              <Box key={i}>
                <Text color='gray'>{'  '}{match[1]}.</Text>
                <Text>{parseInlineStyles(match[2])}</Text>
              </Box>
            );
          }
        }
        if (line.startsWith('```')) {
          return <Text key={i} color='gray'>{line}</Text>;
        }
        if (line.startsWith('>')) {
          return <Text key={i} color='gray' dimColor>{'│ '}{line.slice(1).trim()}</Text>;
        }

        return <Text key={i} wrap='wrap'>{parseInlineStyles(line)}</Text>;
      })}
    </Box>
  );
}
