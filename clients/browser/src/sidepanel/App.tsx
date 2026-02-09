import { useEffect, useState } from 'react';

function App() {
  const [serverAddress, setServerAddress] = useState('http://localhost:5281');
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [state, setState] = useState('disconnected');

  useEffect(() => {
    let initialized = false;
    const check = async () => {
      const s = await chrome.runtime.sendMessage({type: 'getStatus'});
      setState(s.state);
      setServerUrl(s.baseUrl);
      if (!initialized && s.baseUrl) {
        setServerAddress(s.baseUrl);
        initialized = true;
      }
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    if (!serverAddress.trim()) return;
    setState('connecting');
    await chrome.runtime.sendMessage({type: 'connect', url: serverAddress.trim()});
    const s = await chrome.runtime.sendMessage({type: 'getStatus'});
    setState(s.state);
    setServerUrl(s.baseUrl);
  };

  if (state === 'connected' && serverUrl) {
    return <iframe src={serverUrl} className='server-frame' />;
  }

  return (
    <div className='connect-panel'>
      <h1>OmniContext Connect</h1>
      <p className='subtitle'>Enter your server address to get started</p>
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
