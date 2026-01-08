import { Box, Text, useInput } from 'ink';
import React, { useEffect, useMemo, useReducer, useState } from 'react';
import {
  addToInputHistory,
  getInputHistory,
  getInputHistoryLength,
} from '../../services/inputHistoryManager';
import { getAllSlashCommands } from '../../services/slashManager';
import { colors } from '../theme/colors';
import { SlashCommandPicker } from './SlashCommandPicker';

interface InputBoxProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

type State = {
  previousValue: string;
  value: string;
  cursorOffset: number;
  historyIndex: number;
  savedInput: string;
};

type Action =
  | {type: 'move-cursor-left';}
  | {type: 'move-cursor-right';}
  | {type: 'move-cursor-up';}
  | {type: 'move-cursor-down';}
  | {type: 'move-to-line-start';}
  | {type: 'move-to-line-end';}
  | {type: 'insert'; text: string;}
  | {type: 'backspace';}
  | {type: 'delete';}
  | {type: 'set-value'; value: string;}
  | {type: 'clear';};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'move-cursor-left':
      return {...state, cursorOffset: Math.max(0, state.cursorOffset - 1)};
    case 'move-cursor-right':
      return {...state, cursorOffset: Math.min(state.value.length, state.cursorOffset + 1)};
    case 'move-cursor-up':
    case 'move-cursor-down': {
      const lines = state.value.split('\n');
      let pos = 0, line = 0, col = 0;

      for (let i = 0; i < lines.length; i++) {
        if (pos + lines[i].length >= state.cursorOffset) {
          line = i;
          col = state.cursorOffset - pos;
          break;
        }
        pos += lines[i].length + 1;
      }

      const targetLine = action.type === 'move-cursor-up' ? line - 1 : line + 1;

      if (targetLine < 0) {
        const historyLength = getInputHistoryLength();
        if (historyLength === 0) return state;
        const newIndex = Math.min(state.historyIndex + 1, historyLength - 1);
        if (newIndex === state.historyIndex) return state;
        const savedInput = state.historyIndex === -1 ? state.value : state.savedInput;
        const historyValue = getInputHistory()[historyLength - 1 - newIndex];
        return {
          ...state,
          savedInput,
          historyIndex: newIndex,
          value: historyValue,
          cursorOffset: historyValue.length,
        };
      }

      if (targetLine >= lines.length) {
        if (state.historyIndex < 0) return state;
        const newIndex = state.historyIndex - 1;
        if (newIndex < -1) return state;
        const newValue = newIndex === -1
          ? state.savedInput
          : getInputHistory()[getInputHistoryLength() - 1 - newIndex];
        return {...state, historyIndex: newIndex, value: newValue, cursorOffset: newValue.length};
      }

      const targetCol = Math.min(col, lines[targetLine].length);
      let offset = 0;
      for (let i = 0; i < targetLine; i++) offset += lines[i].length + 1;

      return {...state, cursorOffset: offset + targetCol};
    }
    case 'move-to-line-start':
    case 'move-to-line-end': {
      const lines = state.value.split('\n');
      let pos = 0;
      for (let i = 0; i < lines.length; i++) {
        if (pos + lines[i].length >= state.cursorOffset) {
          const offset = action.type === 'move-to-line-start' ? pos : pos + lines[i].length;
          return {...state, cursorOffset: offset};
        }
        pos += lines[i].length + 1;
      }
      return state;
    }
    case 'insert': {
      const normalizedText = action.text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      return {
        ...state,
        previousValue: state.value,
        value: state.value.slice(0, state.cursorOffset) + normalizedText
          + state.value.slice(state.cursorOffset),
        cursorOffset: state.cursorOffset + normalizedText.length,
      };
    }
    case 'backspace': {
      const newCursorOffset = Math.max(0, state.cursorOffset - 1);
      return {
        ...state,
        previousValue: state.value,
        value: state.value.slice(0, newCursorOffset) + state.value.slice(state.cursorOffset),
        cursorOffset: newCursorOffset,
      };
    }
    case 'delete':
      return {
        ...state,
        previousValue: state.value,
        value: state.value.slice(0, state.cursorOffset) + state.value.slice(state.cursorOffset + 1),
      };
    case 'set-value':
      return {
        ...state,
        previousValue: state.value,
        value: action.value,
        cursorOffset: action.value.length,
      };
    case 'clear':
      return {
        previousValue: state.value,
        value: '',
        cursorOffset: 0,
        historyIndex: -1,
        savedInput: '',
      };
    default:
      return state;
  }
};

export function InputBox({onSubmit, disabled}: InputBoxProps): React.ReactElement {
  const [state, dispatch] = useReducer(reducer, {
    previousValue: '',
    value: '',
    cursorOffset: 0,
    historyIndex: -1,
    savedInput: '',
  });
  const [pickerCancelled, setPickerCancelled] = useState(false);

  const filteredSlashCommands = useMemo(() => {
    if (!state.value || !state.value.startsWith('/') || state.value.includes('\n')) return [];
    const query = state.value.slice(1).toLowerCase();
    if (!query) return getAllSlashCommands();
    return getAllSlashCommands().filter(cmd => cmd.name.toLowerCase().startsWith(query));
  }, [state.value]);

  const hasExactMatch = useMemo(() => {
    if (!state.value || !state.value.startsWith('/')) return false;
    const query = state.value.slice(1).toLowerCase();
    return getAllSlashCommands().some(cmd => cmd.name.toLowerCase() === query);
  }, [state.value]);

  const showPicker = !pickerCancelled && !hasExactMatch && filteredSlashCommands.length > 0;

  useEffect(() => {
    setPickerCancelled(false);
  }, [state.value]);

  const {lines, cursorLine, cursorCol, isPlaceholder} = useMemo(() => {
    const isPlaceholder = !state.value;
    const text = state.value || (disabled ? 'Waiting for a response...' : 'Type your message...');
    const lines = text.split('\n');
    let currentPos = 0;
    let cursorLine = 0;
    let cursorCol = 0;

    if (isPlaceholder) {
      cursorLine = 0;
      cursorCol = 0;
    } else {
      for (let i = 0; i < lines.length; i++) {
        if (currentPos + lines[i].length >= state.cursorOffset) {
          cursorLine = i;
          cursorCol = state.cursorOffset - currentPos;
          break;
        }
        currentPos += lines[i].length + 1;
      }
    }

    return {lines, cursorLine, cursorCol, isPlaceholder};
  }, [state.value, state.cursorOffset, disabled]);

  useInput((input, key) => {
    if (key.tab) return;
    if (key.ctrl && input === 'c') return;
    if (key.return && !key.shift && !key.meta) {
      if (showPicker) return;
      if (state.value.trim()) {
        addToInputHistory(state.value);
        onSubmit(state.value);
        dispatch({type: 'clear'});
      }
      return;
    }
    if (input === '\r' || input === '\n') {
      dispatch({type: 'insert', text: '\n'});
      return;
    }
    if (key.upArrow) {
      if (showPicker) return;
      dispatch({type: 'move-cursor-up'});
    } else if (key.downArrow) {
      if (showPicker) return;
      dispatch({type: 'move-cursor-down'});
    } else if (key.leftArrow) {
      dispatch({type: 'move-cursor-left'});
    } else if (key.rightArrow) {
      dispatch({type: 'move-cursor-right'});
    } else if (key.ctrl && input === 'a') {
      dispatch({type: 'move-to-line-start'});
    } else if (key.ctrl && input === 'e') {
      dispatch({type: 'move-to-line-end'});
    } else if (key.backspace || (key.delete && process.platform !== 'win32')) {
      dispatch({type: 'backspace'});
    } else if (key.delete) {
      dispatch({type: 'delete'});
    } else if (input) {
      dispatch({type: 'insert', text: input});
    }
  }, {isActive: !disabled});

  const handleSelectCommand = (commandName: string) => {
    dispatch({type: 'set-value', value: `/${commandName}`});
  };

  const handleCancelPicker = () => {
    setPickerCancelled(true);
  };

  return (
    <Box flexDirection='column' flexGrow={1}>
      {showPicker && (
        <SlashCommandPicker
          commands={filteredSlashCommands}
          onSelectCommand={handleSelectCommand}
          onCancel={handleCancelPicker}
        />
      )}
      <Box
        borderStyle='single'
        borderLeft={false}
        borderRight={false}
        borderColor={disabled ? colors.muted : colors.primary}
        paddingRight={2}
        flexGrow={1}
      >
        <Box marginRight={1} alignSelf='flex-start'>
          <Text color={disabled ? colors.muted : colors.primary} bold>{'❯'}</Text>
        </Box>
        <Box flexGrow={1} flexDirection='column'>
          {lines.map((line, i) => {
            if (cursorLine === i && !disabled) {
              const beforeCursor = line.slice(0, cursorCol);
              const atCursor = line[cursorCol] || ' ';
              const afterCursor = line.slice(cursorCol + 1);
              const textWithCursor = beforeCursor + '\x1b[7m' + atCursor + '\x1b[27m' + afterCursor;
              return (
                <Box key={i}>
                  <Text wrap='wrap' color={isPlaceholder ? colors.muted : undefined}>
                    {textWithCursor}
                  </Text>
                </Box>
              );
            }
            return (
              <Box key={i}>
                <Text wrap='wrap' color={isPlaceholder ? colors.muted : undefined}>
                  {line || ' '}
                </Text>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
