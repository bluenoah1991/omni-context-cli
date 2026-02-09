import { useEffect, useState } from 'react';
import { getServerUrl, loadServerUrl } from '../services/config';
import { connect, getState, setClientType } from '../services/longPollClient';
import { registerCommonTools } from '../tools/common';
import { registerExcelTools } from '../tools/excel';
import { registerPowerPointTools } from '../tools/powerpoint';
import { registerWordTools } from '../tools/word';

let toolsRegistered = false;

function registerTools(host: number | null) {
  if (toolsRegistered) return;
  toolsRegistered = true;
  registerCommonTools();
  switch (host) {
    case Office.HostType.Word:
      registerWordTools();
      break;
    case Office.HostType.Excel:
      registerExcelTools();
      break;
    case Office.HostType.PowerPoint:
      registerPowerPointTools();
      break;
  }
}

function App() {
  const [serverAddress, setServerAddress] = useState('http://localhost:5281');
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [state, setState] = useState('disconnected');
  const [officeReady, setOfficeReady] = useState(false);

  useEffect(() => {
    Office.onReady(({host}) => {
      const hostMap: Record<number, string> = {
        [Office.HostType.Word]: 'word',
        [Office.HostType.Excel]: 'excel',
        [Office.HostType.PowerPoint]: 'powerpoint',
      };
      setClientType(hostMap[host as number] || 'office');
      registerTools(host);
      setOfficeReady(true);
    });
  }, []);

  useEffect(() => {
    if (!officeReady) return;

    let initialized = false;
    const check = () => {
      setState(getState());
      setServerUrl(getServerUrl());
      if (!initialized) {
        const saved = loadServerUrl();
        if (saved) {
          setServerAddress(saved);
        }
        initialized = true;
      }
    };

    check();
    const interval = setInterval(check, 5000);

    return () => clearInterval(interval);
  }, [officeReady]);

  const handleConnect = async () => {
    if (!serverAddress.trim()) return;
    setState('connecting');
    await connect(serverAddress.trim());
    setState(getState());
    setServerUrl(getServerUrl());
  };

  if (!officeReady) {
    return (
      <div className='connect-panel'>
        <p className='subtitle'>Loading...</p>
      </div>
    );
  }

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
