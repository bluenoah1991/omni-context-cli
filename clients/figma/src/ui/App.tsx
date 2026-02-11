import { useCallback, useEffect, useRef, useState } from 'react';
import { getServerUrl } from './services/config';
import { connect, getState } from './services/longPollClient';
import { onInit } from './services/sandboxBridge';
import { registerFigmaTools } from './tools';

function sendResize(width: number, height: number) {
  parent.postMessage({
    pluginMessage: {type: 'resize', width: Math.round(width), height: Math.round(height)},
  }, '*');
}

let toolsRegistered = false;

function App() {
  const [serverAddress, setServerAddress] = useState('http://localhost:5281');
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [state, setState] = useState('disconnected');

  useEffect(() => {
    if (!toolsRegistered) {
      toolsRegistered = true;
      registerFigmaTools();
    }

    onInit(savedUrl => {
      if (savedUrl) {
        setServerAddress(savedUrl);
        connect(savedUrl).then(() => {
          setState(getState());
          setServerUrl(getServerUrl());
        });
      }
    });

    const interval = setInterval(() => {
      setState(getState());
      setServerUrl(getServerUrl());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    if (!serverAddress.trim()) return;
    setState('connecting');
    await connect(serverAddress.trim());
    setState(getState());
    setServerUrl(getServerUrl());
  };

  const dragging = useRef(false);
  const startPos = useRef({x: 0, y: 0, w: 0, h: 0});

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    startPos.current = {x: e.clientX, y: e.clientY, w: window.innerWidth, h: window.innerHeight};
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    sendResize(Math.max(320, startPos.current.w + dx), Math.max(400, startPos.current.h + dy));
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  if (state === 'connected' && serverUrl) {
    return (
      <div style={{width: '100%', height: '100%', position: 'relative'}}>
        <iframe src={serverUrl} className='server-frame' />
        <div
          className='resize-handle'
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      </div>
    );
  }

  return (
    <div className='connect-panel'>
      <h1>OmniContext</h1>
      <p className='subtitle'>Enter your server address to connect</p>
      <input
        type='text'
        value={serverAddress}
        onChange={e => setServerAddress(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleConnect()}
        placeholder='http://localhost:5281'
      />
      <button onClick={handleConnect} disabled={!serverAddress.trim() || state === 'connecting'}>
        {state === 'connecting' ? 'Connecting...' : 'Connect'}
      </button>
    </div>
  );
}

export default App;
