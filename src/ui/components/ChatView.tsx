import { Box } from 'ink';
import React, { useRef } from 'react';
import { loadConfig } from '../../services/appConfig';
import { runConversation } from '../../services/chatOrchestrator';
import { addUserMessage } from '../../services/sessionManager';
import { useChatStore } from '../../store/chatStore';
import { Header } from './Header';
import { InputBox } from './InputBox';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { LoadingIndicator } from './LoadingIndicator';
import { MessageList } from './MessageList';

export function ChatView(): React.ReactElement {
  const {session, messages, isLoading, setSession, updateMessages, setLoading} = useChatStore();
  const abortControllerRef = useRef<AbortController | null>(null);

  const config = loadConfig();

  const handleInterrupt = () => {
    abortControllerRef.current?.abort();
  };

  const handleSubmit = async (text: string) => {
    if (isLoading) return;

    updateMessages(msgs => [...msgs, {role: 'user', content: text, timestamp: Date.now()}]);
    setLoading(true);

    const updatedSession = addUserMessage(session, text, config.provider);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const finalSession = await runConversation(updatedSession, {
        onContent: (content: string) => {
          updateMessages(msgs => {
            const last = msgs[msgs.length - 1];
            if (last?.role === 'assistant') {
              return [...msgs.slice(0, -1), {...last, content: last.content + content}];
            }
            return [...msgs, {role: 'assistant', content, timestamp: Date.now()}];
          });
        },
        onThinking: (thinking: string) => {
          updateMessages(msgs => {
            const last = msgs[msgs.length - 1];
            if (last?.role === 'thinking') {
              return [...msgs.slice(0, -1), {...last, content: last.content + thinking}];
            }
            return [...msgs, {role: 'thinking', content: thinking, timestamp: Date.now()}];
          });
        },
        onToolCall: toolCall => {
          updateMessages(
            msgs => [...msgs, {
              role: 'tool_use',
              content: JSON.stringify(toolCall.input),
              timestamp: Date.now(),
              toolName: toolCall.name,
            }]
          );
        },
        onToolResult: toolResult => {
          updateMessages(
            msgs => [...msgs, {
              role: 'tool_result',
              content: toolResult.content,
              timestamp: Date.now(),
              toolName: toolResult.name,
            }]
          );
        },
      }, abortController.signal);

      setSession(finalSession);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box flexDirection='column' padding={1}>
      <Header config={config} />

      <Box flexDirection='column' flexGrow={1}>
        <MessageList messages={messages} />
      </Box>

      {isLoading && (
        <Box marginTop={1} marginBottom={1}>
          <LoadingIndicator />
        </Box>
      )}

      <Box marginTop={1}>
        <KeyboardShortcuts isLoading={isLoading} onInterrupt={handleInterrupt} />
      </Box>

      <Box>
        <InputBox onSubmit={handleSubmit} disabled={isLoading} />
      </Box>
    </Box>
  );
}
