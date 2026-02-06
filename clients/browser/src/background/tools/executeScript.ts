import { registerTool } from '../toolManager';
import { resolveTabId } from './utils';

interface RuntimeEvaluateResponse {
  result: {type: string; value?: any; description?: string;};
  exceptionDetails?: {text: string; exception?: {description?: string;};};
}

async function executeCustomScript(targetTabId: number, functionCode: string): Promise<any> {
  try {
    await chrome.debugger.attach({tabId: targetTabId}, '1.3');
    const result =
      (await chrome.debugger.sendCommand({tabId: targetTabId}, 'Runtime.evaluate', {
        expression: `(${functionCode})()`,
        awaitPromise: true,
        returnByValue: true,
      })) as RuntimeEvaluateResponse;
    await chrome.debugger.detach({tabId: targetTabId});
    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description || result.exceptionDetails.text,
      );
    }
    return result.result.value;
  } catch (error) {
    await chrome.debugger.detach({tabId: targetTabId}).catch(() => {});
    throw error;
  }
}

export function registerExecuteScriptTool(): void {
  registerTool({
    name: 'ExecuteScript',
    description: 'Execute a custom JavaScript function in a web page and return the result.',
    parameters: {
      properties: {
        functionCode: {
          type: 'string',
          description:
            'The JavaScript function code to execute. Must be a function expression like "() => { return value; }". '
            + 'The function will be executed in the page context and can access DOM APIs and page globals.',
        },
        tabId: {
          type: 'number',
          description:
            'The ID of the tab to execute the script in (optional, defaults to current active tab).',
        },
      },
      required: ['functionCode'],
    },
  }, async (args: {functionCode: string; tabId?: number;}) => {
    const targetTabId = await resolveTabId(args.tabId);
    return executeCustomScript(targetTabId, args.functionCode);
  });
}
