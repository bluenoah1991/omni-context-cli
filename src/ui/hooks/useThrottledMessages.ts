import { useEffect, useRef, useState } from 'react';
import { UIMessage } from '../../types/uiMessage';

export function useThrottledMessages(
  messages: UIMessage[],
  delay: number,
  sessionId: string,
): UIMessage[] {
  const [throttled, setThrottled] = useState({sessionId, messages});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingRef = useRef<UIMessage[] | null>(null);

  const sessionChanged = sessionId !== throttled.sessionId;

  useEffect(() => {
    if (sessionChanged) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      pendingRef.current = null;
      setThrottled({sessionId, messages});
      return;
    }

    if (!timeoutRef.current) {
      setThrottled({sessionId, messages});
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        if (pendingRef.current) {
          setThrottled(prev => ({...prev, messages: pendingRef.current!}));
          pendingRef.current = null;
        }
      }, delay);
    } else {
      pendingRef.current = messages;
    }
  }, [messages, delay, sessionId, sessionChanged]);

  return (sessionChanged ? messages : throttled.messages) ?? [];
}
