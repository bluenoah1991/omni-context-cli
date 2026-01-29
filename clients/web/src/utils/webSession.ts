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

export function apiUrl(route: string): string {
  const wsId = getWebSessionId();
  if (!wsId) {
    throw new Error('No web session');
  }
  const baseUrl = (getMetaContent('server-url') || '').replace(/\/$/, '');
  return `${baseUrl}/api/${wsId}/${route}`;
}
