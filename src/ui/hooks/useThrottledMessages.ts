import { useEffect, useRef, useState } from 'react';
import { UIMessage } from '../../types/uiMessage';

export function useThrottledMessages(
  messages: UIMessage[],
  delay: number,
  isLoading: boolean,
): UIMessage[] {
  const [throttled, setThrottled] = useState(messages);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setThrottled(messages);
      return;
    }

    if (!timeoutRef.current) {
      setThrottled(messages);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
      }, delay);
    }
  }, [messages, delay, isLoading]);

  return (isLoading ? throttled : messages) ?? [];
}
