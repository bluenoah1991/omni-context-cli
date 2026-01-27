import { Maximize2 } from 'lucide-react';
import mermaid from 'mermaid';
import panzoom, { PanZoom } from 'panzoom';
import { memo, useEffect, useRef, useState } from 'react';
import { useChatStore } from '../store/chatStore';

interface MermaidBlockProps {
  code: string;
  isLoading?: boolean;
}

const renderedMap = new Map<string, string>();

export const MermaidBlock = memo(function MermaidBlock({code, isLoading}: MermaidBlockProps) {
  const theme = useChatStore(state => state.theme);
  const renderKey = `${theme}:${code}`;
  const [rendered, setRendered] = useState<string | null>(() => renderedMap.get(renderKey) || null);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<HTMLDivElement>(null);
  const panzoomRef = useRef<PanZoom | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (renderedMap.has(renderKey)) {
      setRendered(renderedMap.get(renderKey)!);
      return;
    }

    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'light' ? 'default' : 'dark',
      suppressErrorRendering: true,
    });

    let cancelled = false;

    const render = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
        const {svg} = await mermaid.render(id, code);
        if (cancelled) return;
        renderedMap.set(renderKey, svg);
        setRendered(svg);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
        setRendered(null);
      }
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [code, theme, renderKey, isLoading]);

  useEffect(() => {
    if (!rendered || !svgRef.current) return;

    const svgElement = svgRef.current.querySelector('svg');
    if (!svgElement) return;

    if (panzoomRef.current) {
      panzoomRef.current.dispose();
    }

    panzoomRef.current = panzoom(svgElement, {maxZoom: 5, minZoom: 0.1, zoomSpeed: 0.1});

    return () => {
      if (panzoomRef.current) {
        panzoomRef.current.dispose();
        panzoomRef.current = null;
      }
    };
  }, [rendered]);

  const handleReset = () => {
    if (panzoomRef.current) {
      panzoomRef.current.moveTo(0, 0);
      panzoomRef.current.zoomAbs(0, 0, 1);
    }
  };

  if (isLoading || (!rendered && !error)) {
    return (
      <div className='my-2 h-100 flex items-center justify-center bg-vscode-element border border-vscode-border rounded-lg text-sm text-vscode-text-muted'>
        Rendering diagram...
      </div>
    );
  }

  if (error) {
    return (
      <div className='my-4 p-4 bg-vscode-error/10 border border-vscode-error/50 rounded-md text-sm text-vscode-text'>
        <div className='font-medium mb-2'>Mermaid Error</div>
        <pre className='text-xs whitespace-pre-wrap'>{error}</pre>
      </div>
    );
  }

  return (
    <div className='my-2 overflow-hidden contain-[layout]'>
      <div className='flex items-center justify-between gap-2 p-2 bg-vscode-element border border-vscode-border border-b-0 rounded-t-lg'>
        <span className='text-xs text-vscode-text-muted'>Scroll to zoom, drag to pan</span>
        <button
          onClick={handleReset}
          className='flex items-center justify-center px-2 py-1 bg-vscode-bg border border-vscode-border rounded text-vscode-text cursor-pointer transition-colors hover:bg-vscode-border'
          title='Reset'
        >
          <Maximize2 size={16} />
        </button>
      </div>
      <div
        className='w-full h-100 overflow-hidden border border-vscode-border rounded-b-lg bg-vscode-element select-none cursor-grab'
        onDoubleClick={handleReset}
      >
        <div ref={svgRef} dangerouslySetInnerHTML={{__html: rendered!}} />
      </div>
    </div>
  );
});
