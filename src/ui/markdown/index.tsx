import { Box, Text } from 'ink';
import { marked, MarkedToken, Token, Tokens } from 'marked';
import React, { useMemo } from 'react';
import stringWidth from 'string-width';
import { colors } from '../theme/colors';
import { HighlightedCode } from './highlight-code';
import {
  isCodespanToken,
  isDelToken,
  isEmToken,
  isImageToken,
  isLinkToken,
  isStrongToken,
  isTextToken,
} from './types';

export const Markdown = React.memo(function Markdown({markdown}: {markdown: string;}) {
  const tokens = useMemo(() => marked.lexer(markdown), [markdown]);
  return (
    <Box flexDirection='column' marginBottom={-1}>
      {tokens.map((token, index) => <TokenRenderer key={index} token={token} />)}
    </Box>
  );
});

function TokenRenderer({token}: {token: Token;}): React.ReactElement {
  if (!isMarkedToken(token)) {
    return <></>;
  }

  switch (token.type) {
    case 'blockquote':
      return <BlockquoteRenderer token={token} />;
    case 'br':
      return <BrRenderer />;
    case 'code':
      return <CodeRenderer token={token} />;
    case 'codespan':
      return <CodespanRenderer token={token} />;
    case 'def':
      return <DefRenderer token={token} />;
    case 'del':
      return <DelRenderer token={token} />;
    case 'em':
      return <EmRenderer token={token} />;
    case 'escape':
      return <EscapeRenderer token={token} />;
    case 'heading':
      return <HeadingRenderer token={token} />;
    case 'hr':
      return <HrRenderer />;
    case 'html':
      return <HtmlRenderer token={token} />;
    case 'image':
      return <ImageRenderer token={token} />;
    case 'link':
      return <LinkRenderer token={token} />;
    case 'list':
      return <ListRenderer token={token} />;
    case 'list_item':
      return <ListItemRenderer token={token} />;
    case 'paragraph':
      return <ParagraphRenderer token={token} />;
    case 'strong':
      return <StrongRenderer token={token} />;
    case 'table':
      return <TableRenderer token={token} />;
    case 'text':
      return <TextRenderer token={token} />;
    case 'space':
      return <SpaceRenderer />;
    default:
      return <></>;
  }
}

function BlockquoteRenderer({token}: {token: Tokens.Blockquote;}) {
  return <Text color={colors.muted} italic>{renderTokensAsPlaintext(token.tokens)}</Text>;
}

function BrRenderer() {
  return <Text>{'\n'}</Text>;
}

function CodeRenderer({token}: {token: Tokens.Code;}) {
  return (
    <Box flexDirection='column' marginBottom={1}>
      <HighlightedCode code={token.text} language={token.lang} />
    </Box>
  );
}

function CodespanRenderer({token}: {token: Tokens.Codespan;}) {
  return <Text color={colors.muted}>{token.text}</Text>;
}

function DefRenderer({token}: {token: Tokens.Def;}) {
  // Don't render definition links which are usually referenced elsewhere.
  return <></>;
}

function DelRenderer({token}: {token: Tokens.Del;}) {
  return <Text strikethrough dimColor>{renderTokensAsPlaintext(token.tokens)}</Text>;
}

function EmRenderer({token}: {token: Tokens.Em;}) {
  return <Text italic>{renderTokensAsPlaintext(token.tokens)}</Text>;
}

function EscapeRenderer({token}: {token: Tokens.Escape;}) {
  return <Text>{token.text}</Text>;
}

function HeadingRenderer({token}: {token: Tokens.Heading;}) {
  return (
    <Box marginBottom={1}>
      <Text bold>{renderTokensAsPlaintext(token.tokens)}</Text>
    </Box>
  );
}

function HrRenderer() {
  return (
    <Box marginBottom={1}>
      <Text color={colors.muted}>{'─'.repeat(40)}</Text>
    </Box>
  );
}

function HtmlRenderer({token}: {token: Tokens.HTML | Tokens.Tag;}) {
  return <Text>{token.text}</Text>;
}

function ImageRenderer({token}: {token: Tokens.Image;}) {
  return <Text color={colors.muted}>[{token.text}]</Text>;
}

function LinkRenderer({token}: {token: Tokens.Link;}) {
  return <Text>{renderTokensAsPlaintext(token.tokens)}</Text>;
}

function ListRenderer({token}: {token: Tokens.List;}) {
  return (
    <Box flexDirection='column' marginBottom={1}>
      {token.items.map((item, index) => (
        <Box key={index} flexDirection='row'>
          <Text>
            {token.ordered
              ? `${(typeof token.start === 'number' ? token.start : 1) + index}. `
              : '- '}
          </Text>
          <ListItemRenderer token={item} />
        </Box>
      ))}
    </Box>
  );
}

function ListItemRenderer({token}: {token: Tokens.ListItem;}) {
  return (
    <Box flexDirection='column' flexGrow={1}>
      {token.task && typeof token.checked === 'boolean' && (
        <Text>{token.checked ? '[x]' : '[ ]'}</Text>
      )}
      {token.tokens.map((childToken, index) => <TokenRenderer key={index} token={childToken} />)}
    </Box>
  );
}

function ParagraphRenderer({token}: {token: Tokens.Paragraph;}) {
  return (
    <Box marginBottom={1}>
      <Text>{renderTokensAsPlaintext(token.tokens)}</Text>
    </Box>
  );
}

function StrongRenderer({token}: {token: Tokens.Strong;}) {
  return <Text bold>{renderTokensAsPlaintext(token.tokens)}</Text>;
}

function TableRenderer({token}: {token: Tokens.Table;}) {
  const allRows = [token.header, ...token.rows];
  const columnWidths = token.header.map((_, colIndex) => {
    const maxWidth = Math.max(...allRows.map(row => {
      const cell = row[colIndex];
      if (cell) {
        const cellText = renderTokensAsPlaintext(cell.tokens);
        return stringWidth(cellText);
      }
      return 0;
    }));
    return Math.max(maxWidth, 3);
  });

  return (
    <Box flexDirection='column' marginBottom={1}>
      <TableRowRenderer cells={token.header} columnWidths={columnWidths} isHeader={true} />
      <Text color={colors.muted}>{'─'.repeat(columnWidths.reduce((a, b) => a + b + 2, 0))}</Text>
      {token.rows.map((row, index) => (
        <TableRowRenderer key={index} cells={row} columnWidths={columnWidths} isHeader={false} />
      ))}
    </Box>
  );
}

function TableRowRenderer(
  {cells, columnWidths, isHeader}: {
    cells: Tokens.TableCell[];
    columnWidths: number[];
    isHeader: boolean;
  },
) {
  return (
    <Box flexDirection='row'>
      {cells.map((cell, index) => {
        const cellText = renderTokensAsPlaintext(cell.tokens);
        const paddedText = cellText.padEnd(columnWidths[index]);
        return (
          <React.Fragment key={index}>
            <Text bold={isHeader}>{paddedText}</Text>
            {index < cells.length - 1 && <Text></Text>}
          </React.Fragment>
        );
      })}
    </Box>
  );
}

function TextRenderer({token}: {token: Tokens.Text;}) {
  if (token.tokens) {
    return <Text>{renderTokensAsPlaintext(token.tokens)}</Text>;
  }
  return <Text>{token.text}</Text>;
}

function SpaceRenderer() {
  return <></>;
}

function renderTokensAsPlaintext(tokens: Token[]): string {
  return tokens.map(token => {
    if (isTextToken(token)) {
      return token.text;
    }
    if (isLinkToken(token)) {
      return `${renderTokensAsPlaintext(token.tokens)} (${token.href})`;
    }
    if (isImageToken(token)) {
      return `[Image: ${token.text}]`;
    }
    if (isStrongToken(token)) {
      return renderTokensAsPlaintext(token.tokens);
    }
    if (isEmToken(token)) {
      return renderTokensAsPlaintext(token.tokens);
    }
    if (isDelToken(token)) {
      return renderTokensAsPlaintext(token.tokens);
    }
    if (isCodespanToken(token)) {
      return ` ${token.text} `;
    }
    if ('tokens' in token && Array.isArray(token.tokens)) {
      return renderTokensAsPlaintext(token.tokens);
    }
    if ('text' in token) {
      return token.text;
    }
    return '';
  }).join('');
}

const MARKED_TOKEN_TYPES = [
  'blockquote',
  'br',
  'code',
  'codespan',
  'def',
  'del',
  'em',
  'escape',
  'heading',
  'hr',
  'html',
  'image',
  'link',
  'list',
  'list_item',
  'paragraph',
  'space',
  'strong',
  'table',
  'text',
];

/**
 * Marked provides a `Tokens.Generic` interface that accepts any string for `type`, which breaks
 * type narrowing for `Token`. We check that the token is not generic (ie. a `MarkedToken`) before
 * filtering for token types to preserve type narrowing.
 * https://github.com/markedjs/marked/issues/2938
 */
function isMarkedToken(token: Token): token is MarkedToken {
  return MARKED_TOKEN_TYPES.includes(token.type);
}
