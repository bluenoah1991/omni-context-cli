function getWebSessionId(): string | null {
  const path = window.location.pathname;
  const match = path.match(/^\/webSession\/([a-z0-9-]+)$/);
  return match ? match[1] : null;
}

export function apiUrl(route: string): string {
  const wsId = getWebSessionId();
  if (!wsId) {
    throw new Error('No web session');
  }
  return `/api/${wsId}/${route}`;
}
