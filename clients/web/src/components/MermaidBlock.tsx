import { Maximize2 } from 'lucide-react';
import mermaid from 'mermaid';
import panzoom, { PanZoom } from 'panzoom';
import { memo, useEffect, useRef, useState } from 'react';
import { useChatStore } from '../store/chatStore';

interface MermaidBlockProps {
  code: string;
}

export const MermaidBlock = memo(function MermaidBlock({code}: MermaidBlockProps) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const svgRef = useRef<HTMLDivElement>(null);
  const panzoomRef = useRef<PanZoom | null>(null);
  const theme = useChatStore(state => state.theme);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'light' ? 'default' : 'dark',
      securityLevel: 'loose',
      suppressErrorRendering: true,
    });

    const render = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const {svg} = await mermaid.render(id, code);
        setSvg(svg);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
        setSvg('');
      }
    };

    render();
  }, [code, theme]);

  useEffect(() => {
    if (!svg || !svgRef.current) return;

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
  }, [svg]);

  const handleReset = () => {
    if (panzoomRef.current) {
      panzoomRef.current.moveTo(0, 0);
      panzoomRef.current.zoomAbs(0, 0, 1);
    }
  };

  if (error) {
    return (
      <div className='my-4 p-4 bg-vscode-error/10 border border-vscode-error/50 rounded-md text-sm text-vscode-text'>
        <div className='font-medium mb-2'>Mermaid Error</div>
        <pre className='text-xs whitespace-pre-wrap'>{error}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className='my-4 p-4 bg-vscode-element rounded-md text-vscode-text-muted text-sm'>
        Rendering diagram...
      </div>
    );
  }

  return (
    <div className='my-2 w-full overflow-hidden'>
      <div className='flex items-center justify-between gap-2 p-2 bg-vscode-element border border-vscode-border border-b-0 rounded-t-lg'>
        <span className='text-xs text-vscode-text-muted'>Scroll to zoom, drag to pan</span>
        <button
          onClick={handleReset}
          className='flex items-center justify-center px-2 py-1 bg-vscode-bg border border-vscode-border rounded text-vscode-text cursor-pointer transition-all duration-200 hover:bg-vscode-border'
          title='Reset'
        >
          <Maximize2 size={16} />
        </button>
      </div>
      <div
        className='w-full h-[400px] overflow-hidden border border-vscode-border rounded-b-lg bg-white select-none cursor-grab'
        onDoubleClick={handleReset}
      >
        <div ref={svgRef} dangerouslySetInnerHTML={{__html: svg}} />
      </div>
    </div>
  );
});
