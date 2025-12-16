import { useEffect, useRef, useState } from 'react';
import { UIMessage } from '../../types/uiMessage';

export function useThrottledMessages(messages: UIMessage[], delay: number): UIMessage[] {
  const [throttledMessages, setThrottledMessages] = useState(messages);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingMessagesRef = useRef<UIMessage[] | null>(null);

  useEffect(() => {
    if (!timeoutRef.current) {
      setThrottledMessages(messages);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        if (pendingMessagesRef.current) {
          setThrottledMessages(pendingMessagesRef.current);
          pendingMessagesRef.current = null;
        }
      }, delay);
    } else {
      pendingMessagesRef.current = messages;
    }
  }, [messages, delay]);

  return throttledMessages;
}
