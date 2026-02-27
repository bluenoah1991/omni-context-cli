function getMetaContent(name: string): string | null {
  const meta = document.querySelector(`meta[name="${name}"]`);
  return meta?.getAttribute('content') || null;
}

function getWebSessionId(): string | null {
  const path = window.location.pathname;
  const match = path.match(/^\/webSession\/([a-z0-9-]+)$/);
  if (match) {
    return match[1];
  }
  return getMetaContent('websession-id');
}

function getBaseUrl(): string {
  return (getMetaContent('server-url') || '').replace(/\/$/, '');
}

export function globalApiUrl(route: string): string {
  return `${getBaseUrl()}/api/${route}`;
}

export function apiUrl(route: string): string {
  const wsId = getWebSessionId();
  if (!wsId) {
    throw new Error('No web session');
  }
  return `${getBaseUrl()}/api/${wsId}/${route}`;
}
