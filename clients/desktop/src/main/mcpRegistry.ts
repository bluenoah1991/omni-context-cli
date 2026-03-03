import { net } from 'electron';

const BASE_URL = 'https://registry.modelcontextprotocol.io/v0.1/servers?version=latest&limit=5';

export async function fetchMcpRegistry(
  cursor?: string,
  search?: string,
): Promise<Record<string, any>> {
  try {
    let url = BASE_URL;
    if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    const response = await net.fetch(url, {headers: {Accept: 'application/json'}});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err: any) {
    return {error: err?.message || String(err)};
  }
}
