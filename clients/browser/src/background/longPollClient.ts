import { ToolExecutionResult } from '../types/tool';
import { getServerUrl, loadServerUrl, setServerUrl } from './config';
import { executeTool, getToolDefinitions } from './toolManager';

const CLIENT_TYPE = 'browser';
const MAX_FAILURES = 3;

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

let state: ConnectionState = 'disconnected';
let abortController: AbortController | null = null;
let polling: Promise<void> | null = null;

export function getState(): ConnectionState {
  return state;
}

export async function connect(url?: string): Promise<void> {
  let baseUrl = url?.trim().replace(/\/+$/, '') || await loadServerUrl();
  if (!baseUrl) return;

  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `http://${baseUrl}`;
  }

  if (baseUrl === getServerUrl() && state !== 'disconnected') return;

  abortController?.abort();
  if (polling) await polling;

  state = 'connecting';
  await setServerUrl(baseUrl);

  try {
    const resp = await fetch(`${baseUrl}/api/health`);
    if (resp.ok) {
      state = 'connected';
    }
  } catch {}

  abortController = new AbortController();
  polling = poll(baseUrl, abortController.signal);
}

async function poll(baseUrl: string, signal: AbortSignal): Promise<void> {
  const toolDefinitions = getToolDefinitions();
  let pendingResult: ToolExecutionResult | null = null;
  let failures = 0;

  while (!signal.aborted && failures < MAX_FAILURES) {
    try {
      const body: Record<string, unknown> = {clientType: CLIENT_TYPE, toolDefinitions};
      if (pendingResult) {
        body.toolResult = pendingResult;
      }

      const resp = await fetch(`${baseUrl}/api/remote/poll`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
        signal,
      });

      if (!resp.ok) {
        failures++;
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      state = 'connected';
      failures = 0;
      pendingResult = null;

      const data = await resp.json();
      if (data?.kicked) break;

      if (data?.toolCall) {
        pendingResult = await executeTool(data.toolCall.name, data.toolCall.input);
      }
    } catch (err: any) {
      if (signal.aborted) break;
      failures++;
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  state = 'disconnected';
  polling = null;
}
