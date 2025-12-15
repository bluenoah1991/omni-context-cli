import { Box, Text } from 'ink';
import React, { useRef } from 'react';
import { loadConfig } from '../../services/appConfig';
import { runConversation } from '../../services/chatOrchestrator';
import { addUserMessage } from '../../services/sessionManager';
import { useChatStore } from '../../store/chatStore';
import { Header } from './Header';
import { InputBox } from './InputBox';
import { LoadingIndicator } from './LoadingIndicator';
import { MarkdownText } from './MarkdownText';
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

        {isLoading && currentThinking && <ThinkingBlock content={currentThinking} isStreaming />}

        {isLoading && currentContent && (
          <Box marginY={1} flexDirection='column'>
            <Box marginBottom={1}>
              <Text color='magenta' bold>{'◆'}</Text>
              <Text color='gray'>Assistant</Text>
            </Box>
            <Box paddingLeft={2}>
              <MarkdownText content={currentContent} />
              <Text color='cyan'>{'▌'}</Text>
            </Box>
          </Box>
        )}

        {isLoading && !currentContent && !currentThinking && (
          <Box marginY={1}>
            <LoadingIndicator />
          </Box>
        )}

        {error && (
          <Box marginY={1}>
            <Text color='red'>{error}</Text>
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <InputBox onSubmit={handleSubmit} disabled={isLoading} />
      </Box>
    </Box>
  );
}
