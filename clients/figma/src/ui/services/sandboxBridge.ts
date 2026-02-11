type PendingRequest = {resolve: (value: any) => void;};

const pending = new Map<string, PendingRequest>();
let idCounter = 0;

const initListeners: Array<(serverUrl: string | null) => void> = [];

window.addEventListener('message', event => {
  const msg = event.data?.pluginMessage;
  if (!msg) return;

  if (msg.type === 'init') {
    initListeners.forEach(fn => fn(msg.serverUrl ?? null));
    return;
  }

  if (msg.responseId) {
    const req = pending.get(msg.responseId);
    if (req) {
      pending.delete(msg.responseId);
      req.resolve(
        msg.error ? {success: false, error: msg.error} : {success: true, result: msg.result},
      );
    }
  }
});

export function callSandbox(
  tool: string,
  args: any,
): Promise<{success: boolean; result?: any; error?: string;}> {
  return new Promise(resolve => {
    const requestId = `req_${++idCounter}`;
    pending.set(requestId, {resolve});
    parent.postMessage({pluginMessage: {type: 'toolCall', tool, args, requestId}}, '*');
  });
}

export function getConfigFromSandbox(key: string): Promise<any> {
  return new Promise(resolve => {
    const requestId = `req_${++idCounter}`;
    pending.set(requestId, {resolve: res => resolve(res?.result ?? null)});
    parent.postMessage({pluginMessage: {type: 'getConfig', key, requestId}}, '*');
  });
}

export function setConfigInSandbox(key: string, value: any): void {
  parent.postMessage({pluginMessage: {type: 'setConfig', key, value}}, '*');
}

export function onInit(fn: (serverUrl: string | null) => void): void {
  initListeners.push(fn);
}
