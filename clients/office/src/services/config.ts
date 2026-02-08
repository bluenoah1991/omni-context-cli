const STORAGE_KEY = 'serverUrl';

let serverUrl: string | null = null;

export function getServerUrl(): string | null {
  return serverUrl;
}

export function setServerUrl(url: string): void {
  serverUrl = url;
  localStorage.setItem(STORAGE_KEY, url);
}

export function loadServerUrl(): string | null {
  serverUrl = localStorage.getItem(STORAGE_KEY);
  return serverUrl;
}
