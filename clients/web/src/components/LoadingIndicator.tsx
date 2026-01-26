import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

const loadingVerbs = [
  'Conspiring',
  'Conjuring',
  'Meddling',
  'Tinkering',
  'Weaving',
  'Brewing',
  'Convoluting',
  'Obfuscating',
  'Transmuting',
  'Manifesting',
];

function useLoadingText() {
  const [text, setText] = useState(() =>
    loadingVerbs[Math.floor(Math.random() * loadingVerbs.length)]
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setText(loadingVerbs[Math.floor(Math.random() * loadingVerbs.length)]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return text;
}

export function LoadingIndicator() {
  const text = useLoadingText();
  return (
    <div className='flex items-center gap-2 text-vscode-text-muted'>
      <Loader2 size={16} className='animate-spin' />
      <span className='text-sm'>{text}...</span>
    </div>
  );
}
