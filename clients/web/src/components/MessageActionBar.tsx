import { Check, Copy, RefreshCw, Square, Undo2, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../i18n';

interface MessageActionBarProps {
  content: string;
  onRetry: () => void;
  onRewind: () => void;
}

export function MessageActionBar({content, onRetry, onRewind}: MessageActionBarProps) {
  const t = useLocale();
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      clearTimeout(copyTimerRef.current);
      speechSynthesis.cancel();
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleReadAloud = () => {
    if (speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    speechSynthesis.speak(utterance);
  };

  return (
    <div className='flex items-center gap-0.5 mt-1'>
      <button
        type='button'
        onClick={onRetry}
        className='p-1 rounded transition-colors text-vscode-text-muted hover:text-vscode-text hover:bg-vscode-element'
        title={t.actions.retry}
      >
        <RefreshCw size={14} />
      </button>
      <button
        type='button'
        onClick={onRewind}
        className='p-1 rounded transition-colors text-vscode-text-muted hover:text-vscode-text hover:bg-vscode-element'
        title={t.actions.rewind}
      >
        <Undo2 size={14} />
      </button>
      {content && (
        <>
          <button
            type='button'
            onClick={handleCopy}
            className='p-1 rounded transition-colors text-vscode-text-muted hover:text-vscode-text hover:bg-vscode-element'
            title={copied ? t.actions.copied : t.actions.copy}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <button
            type='button'
            onClick={handleReadAloud}
            className='p-1 rounded transition-colors text-vscode-text-muted hover:text-vscode-text hover:bg-vscode-element'
            title={speaking ? t.actions.stopReading : t.actions.readAloud}
          >
            {speaking ? <Square size={14} /> : <Volume2 size={14} />}
          </button>
        </>
      )}
    </div>
  );
}
