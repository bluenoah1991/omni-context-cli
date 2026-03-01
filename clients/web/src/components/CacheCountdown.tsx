import { Timer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocale } from '../i18n';
import { useChatStore } from '../store/chatStore';

export function CacheCountdown() {
  const {currentModel, currentSession, config, lastResponseAt, showCacheCountdown, isLoading} =
    useChatStore();
  const t = useLocale();
  const [remaining, setRemaining] = useState<number | null>(null);

  const isAnthropic = currentModel?.provider === 'anthropic';
  const contextLimit = (currentModel?.contextSize || 200) * 1024;
  const totalTokens = (currentSession?.inputTokens ?? 0) + (currentSession?.outputTokens ?? 0);
  const useDefaultTtl = (totalTokens / contextLimit) >= 0.5;
  const ttlSeconds = config?.cacheTtl === '1h' && !useDefaultTtl ? 3600 : 300;

  useEffect(() => {
    if (!isAnthropic || !showCacheCountdown || !lastResponseAt || isLoading) {
      setRemaining(null);
      return;
    }

    const elapsed = Math.floor((Date.now() - lastResponseAt) / 1000);
    const left = ttlSeconds - elapsed;
    setRemaining(Math.max(left, 0));
  }, [isAnthropic, showCacheCountdown, lastResponseAt, ttlSeconds, isLoading]);

  useEffect(() => {
    if (remaining === null || remaining <= 0 || isLoading) return;
    const timer = setTimeout(() => {
      const elapsed = Math.floor((Date.now() - lastResponseAt!) / 1000);
      setRemaining(Math.max(ttlSeconds - elapsed, 0));
    }, 1000);
    return () => clearTimeout(timer);
  }, [remaining, lastResponseAt, ttlSeconds, isLoading]);

  if (remaining === null) return null;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`;
  const isLow = remaining <= 30;

  return (
    <div
      className={`hidden sm:flex items-center gap-1.5 text-sm tabular-nums ${
        isLow ? 'text-amber-400' : 'text-vscode-text-muted'
      }`}
      title={t.app.cacheExpiry(display)}
    >
      <Timer size={16} />
      <span>{display}</span>
    </div>
  );
}
