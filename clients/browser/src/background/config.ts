const STORAGE_KEY = 'serverUrl';

let serverUrl: string | null = null;

export function getServerUrl(): string | null {
  return serverUrl;
}

export async function setServerUrl(url: string): Promise<void> {
  serverUrl = url;
  await chrome.storage.local.set({[STORAGE_KEY]: url});
}

export async function loadServerUrl(): Promise<string | null> {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  serverUrl = (data[STORAGE_KEY] as string) || null;
  return serverUrl;
}
