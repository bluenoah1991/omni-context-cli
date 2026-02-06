import { useEffect, useState } from 'react';

function App() {
  const [serverUrl, setServerUrl] = useState('localhost:5281');
  const [state, setState] = useState('disconnected');

  useEffect(() => {
    let initialized = false;
    const check = async () => {
      const s = await chrome.runtime.sendMessage({type: 'getStatus'});
      setState(s.state);
      if (!initialized && s.baseUrl) {
        setServerUrl(s.baseUrl.replace(/^https?:\/\//, ''));
        initialized = true;
      }
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    if (!serverUrl.trim()) return;
    await chrome.runtime.sendMessage({type: 'connect', url: serverUrl.trim()});
    setState('connecting');
  };

  if (state === 'connected') {
    const src = serverUrl.startsWith('http') ? serverUrl : `http://${serverUrl}`;
    return <iframe src={src} className='server-frame' />;
  }

  return (
    <div className='connect-panel'>
      <h1>OmniContext Connect</h1>
      <p className='subtitle'>Enter your server address to get started</p>
      <input
        type='text'
        value={serverUrl}
        onChange={e => setServerUrl(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleConnect()}
        placeholder='localhost:5281'
      />
      <button onClick={handleConnect} disabled={!serverUrl.trim()}>Connect</button>
    </div>
  );
}

export default App;
