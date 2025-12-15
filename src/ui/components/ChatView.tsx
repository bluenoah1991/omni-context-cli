import { Box, Text } from 'ink';
import React, { useRef } from 'react';
import { loadConfig } from '../../services/appConfig';
import { runConversation } from '../../services/chatOrchestrator';
import { addUserMessage } from '../../services/sessionManager';
import { useChatStore } from '../../store/chatStore';
import { colors } from '../theme/colors';
import { AssistantBlock } from './AssistantBlock';
import { ExitPrompt } from './ExitPrompt';
import { Header } from './Header';
import { InputBox } from './InputBox';
import { LoadingIndicator } from './LoadingIndicator';
import { MessageList } from './MessageList';
import { ThinkingBlock } from './ThinkingBlock';

export function ChatView(): React.ReactElement {
  const {
    session,
    messages,
    isLoading,
    currentThinking,
    currentContent,
    error,
    setSession,
    addMessage,
    setLoading,
    setCurrentThinking,
    appendCurrentThinking,
    setCurrentContent,
    appendCurrentContent,
    setError,
  } = useChatStore();

  const config = loadConfig();
  const thinkingRef = useRef('');
  const contentRef = useRef('');

  const handleSubmit = async (text: string) => {
    if (isLoading) return;

    addMessage({role: 'user', content: text, timestamp: Date.now()});
    setLoading(true);
    setCurrentThinking('');
    setCurrentContent('');
    setError(null);
    thinkingRef.current = '';
    contentRef.current = '';

    const updatedSession = addUserMessage(session, text, config.provider);
    setSession(updatedSession);

    try {
      const finalSession = await runConversation(updatedSession, {
        onContent: content => {
          contentRef.current += content;
          appendCurrentContent(content);
        },
        onThinking: thinking => {
          thinkingRef.current += thinking;
          appendCurrentThinking(thinking);
        },
        onToolCall: toolCall => {
          addMessage({
            role: 'tool_use',
            content: JSON.stringify(toolCall.input),
            timestamp: Date.now(),
            toolName: toolCall.name,
          });
        },
        onToolResult: toolResult => {
          addMessage({
            role: 'tool_result',
            content: toolResult.content,
            timestamp: Date.now(),
            toolName: toolResult.name,
          });
        },
        onError: errorText => {
          setError(errorText);
        },
      });

      setSession(finalSession);

      if (thinkingRef.current) {
        addMessage({role: 'thinking', content: thinkingRef.current, timestamp: Date.now()});
      }

      if (contentRef.current) {
        addMessage({role: 'assistant', content: contentRef.current, timestamp: Date.now()});
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
      setCurrentThinking('');
      setCurrentContent('');
    }
  };

  return (
    <Box flexDirection='column' padding={1}>
      <Header config={config} />

      <Box flexDirection='column' flexGrow={1}>
        <MessageList messages={messages} />

        {isLoading && currentThinking && <ThinkingBlock content={currentThinking} />}

        {isLoading && currentContent && <AssistantBlock content={currentContent} />}

        {error && (
          <Box marginY={1}>
            <Text color={colors.text.error}>{error}</Text>
          </Box>
        )}
      </Box>

      {isLoading && (
        <Box marginTop={1} marginBottom={1}>
          <LoadingIndicator />
        </Box>
      )}

      <Box marginTop={1} justifyContent='space-between'>
        <ExitPrompt />
        <Text color={colors.text.dimmed}>
          {isLoading ? '(Press ESC to interrupt)' : '(Press ESC to enter the menu)'}
        </Text>
      </Box>

      <Box>
        <InputBox onSubmit={handleSubmit} disabled={isLoading} />
      </Box>
    </Box>
  );
}
