import { registerTool } from '../toolManager';
import { resolveTabId } from './utils';

async function ensureScriptInPage(targetTabId: number): Promise<void> {
  const checkResult = await chrome.scripting.executeScript({
    target: {tabId: targetTabId},
    func: () => typeof (window as any).extractPageHtml === 'function',
  });
  if (!checkResult[0]?.result) {
    const injectorResults = await chrome.scripting.executeScript({
      target: {tabId: targetTabId},
      files: ['readabilityExtractor.js'],
    });
    if (!injectorResults?.length) {
      throw new Error('Failed to inject content extractor');
    }
  }
}

async function executeExtractor(targetTabId: number, method: string): Promise<any> {
  await ensureScriptInPage(targetTabId);
  const extractResults = await chrome.scripting.executeScript({
    target: {tabId: targetTabId},
    func: (m: string) => (window as any)[m](),
    args: [method],
  });
  if (!extractResults?.length) {
    throw new Error(`Failed to execute ${method}`);
  }
  const result = extractResults[0].result;
  if (result?.error) {
    throw new Error(result.error);
  }
  return result;
}

export function registerPageContentTools(): void {
  registerTool({
    name: 'GetPageContentHtml',
    description: 'Extract the HTML structure of a web page with noise filtering applied.',
    parameters: {
      properties: {
        tabId: {
          type: 'number',
          description:
            'The ID of the tab to extract HTML from (optional, defaults to current active tab).',
        },
      },
      required: [],
    },
  }, async (args: {tabId?: number;}) => {
    const targetTabId = await resolveTabId(args.tabId);
    return executeExtractor(targetTabId, 'extractPageHtml');
  });
  registerTool({
    name: 'GetPageContentText',
    description: 'Extract the main article content from a web page in clean plain text format.',
    parameters: {
      properties: {
        tabId: {
          type: 'number',
          description:
            'The ID of the tab to extract text from (optional, defaults to current active tab).',
        },
      },
      required: [],
    },
  }, async (args: {tabId?: number;}) => {
    const targetTabId = await resolveTabId(args.tabId);
    return executeExtractor(targetTabId, 'extractPageText');
  });
  registerTool({
    name: 'GetPageMetadata',
    description: 'Extract metadata from the <head> section of a web page.',
    parameters: {
      properties: {
        tabId: {
          type: 'number',
          description:
            'The ID of the tab to extract metadata from (optional, defaults to current active tab).',
        },
      },
      required: [],
    },
  }, async (args: {tabId?: number;}) => {
    const targetTabId = await resolveTabId(args.tabId);
    return executeExtractor(targetTabId, 'extractPageMetadata');
  });
}
