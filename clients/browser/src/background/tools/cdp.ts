import { registerTool } from '../toolManager';
import { resolveTabId } from './utils';

const DISABLED_DOMAINS = ['Storage', 'IndexedDB', 'CacheStorage', 'DOMStorage'];

const DISABLED_METHODS = [
  'Network.getCookies',
  'Network.getAllCookies',
  'Network.setCookie',
  'Network.setCookies',
  'Network.deleteCookies',
  'Page.captureScreenshot',
];

function isDisabledDomain(method: string): boolean {
  const domain = method.split('.')[0];
  return DISABLED_DOMAINS.includes(domain);
}

function isDisabledMethod(method: string): boolean {
  return DISABLED_METHODS.includes(method);
}

async function executeCDP(
  targetTabId: number,
  method: string,
  params?: Record<string, unknown>,
): Promise<any> {
  if (isDisabledDomain(method)) {
    const domain = method.split('.')[0];
    throw new Error(
      `CDP domain "${domain}" is disabled. Storage and data-related domains (${
        DISABLED_DOMAINS.join(', ')
      }) are not allowed for security reasons.`,
    );
  }
  if (isDisabledMethod(method)) {
    throw new Error(`CDP method "${method}" is disabled for security reasons.`);
  }
  try {
    await chrome.debugger.attach({tabId: targetTabId}, '1.3');
    const result = await chrome.debugger.sendCommand({tabId: targetTabId}, method, params);
    await chrome.debugger.detach({tabId: targetTabId});
    return result;
  } catch (error) {
    await chrome.debugger.detach({tabId: targetTabId}).catch(() => {});
    throw error;
  }
}

export function registerCDPTool(): void {
  registerTool({
    name: 'ExecuteCDP',
    description:
      'Execute any Chrome DevTools Protocol (CDP) command to access full browser debugging capabilities.',
    parameters: {
      properties: {
        method: {
          type: 'string',
          description:
            'The CDP method to execute (e.g., "Page.navigate", "Runtime.evaluate", "DOM.getDocument"). '
            + 'Use dot notation with domain and method name as specified in CDP documentation.',
        },
        params: {
          type: 'object',
          description: 'Optional parameters for the CDP method as a JSON object. '
            + 'Parameter structure varies by method - refer to CDP documentation for specific method requirements.',
        },
        tabId: {
          type: 'number',
          description:
            'The ID of the tab to execute the command in (optional, defaults to current active tab).',
        },
      },
      required: ['method'],
    },
  }, async (args: {method: string; params?: Record<string, unknown>; tabId?: number;}) => {
    const targetTabId = await resolveTabId(args.tabId);
    return executeCDP(targetTabId, args.method, args.params);
  });
}
