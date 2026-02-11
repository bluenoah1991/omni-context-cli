import { getConfigFromSandbox, setConfigInSandbox } from './sandboxBridge';

let serverUrl: string | null = null;

export function getServerUrl(): string | null {
  return serverUrl;
}

export function setServerUrl(url: string): void {
  serverUrl = url;
  setConfigInSandbox('serverUrl', url);
}

export async function loadServerUrl(): Promise<string | null> {
  serverUrl = await getConfigFromSandbox('serverUrl');
  return serverUrl;
}
