import { registerTool } from '../toolManager';

export function registerTabTools(): void {
  registerTool({
    name: 'GetTabs',
    description: 'Retrieve information about all currently open browser tabs.',
    parameters: {properties: {}, required: []},
  }, async () => {
    const tabs = await chrome.tabs.query({});
    return {
      tabs: tabs.map(tab => ({
        id: tab.id,
        url: tab.url,
        title: tab.title,
        active: tab.active,
        windowId: tab.windowId,
        index: tab.index,
        pinned: tab.pinned,
        audible: tab.audible,
        discarded: tab.discarded,
        incognito: tab.incognito,
      })),
    };
  });
  registerTool({
    name: 'OpenUrl',
    description: 'Open a URL in a new browser tab.',
    parameters: {
      properties: {
        url: {type: 'string', description: 'The URL to open.'},
        active: {
          type: 'boolean',
          description: 'Whether to activate the new tab. Defaults to true.',
        },
      },
      required: ['url'],
    },
  }, async (args: {url: string; active?: boolean;}) => {
    const tab = await chrome.tabs.create({url: args.url, active: args.active !== false});
    return {tabId: tab.id, url: tab.url || args.url};
  });
  registerTool({
    name: 'RefreshTab',
    description: 'Refresh a specific browser tab by its tab ID.',
    parameters: {
      properties: {
        tabId: {
          type: 'number',
          description:
            'The unique ID of the tab to refresh. You can get tab IDs using the getTabs tool.',
        },
        bypassCache: {
          type: 'boolean',
          description: 'Whether to bypass the cache when refreshing. Defaults to false.',
        },
      },
      required: ['tabId'],
    },
  }, async (args: {tabId: number; bypassCache?: boolean;}) => {
    await chrome.tabs.reload(args.tabId, {bypassCache: args.bypassCache || false});
    return {tabId: args.tabId, message: `Tab ${args.tabId} refreshed successfully`};
  });
  registerTool({
    name: 'CloseTab',
    description: 'Close a specific browser tab by its tab ID.',
    parameters: {
      properties: {
        tabId: {
          type: 'number',
          description:
            'The unique ID of the tab to close. You can get tab IDs using the getTabs tool.',
        },
      },
      required: ['tabId'],
    },
  }, async (args: {tabId: number;}) => {
    await chrome.tabs.remove(args.tabId);
    return {message: `Tab ${args.tabId} closed successfully`};
  });
  registerTool({
    name: 'SwitchToTab',
    description: 'Switch to a specific browser tab by its tab ID.',
    parameters: {
      properties: {
        tabId: {
          type: 'number',
          description:
            'The unique ID of the tab to switch to. You can get tab IDs using the getTabs tool.',
        },
      },
      required: ['tabId'],
    },
  }, async (args: {tabId: number;}) => {
    await chrome.tabs.update(args.tabId, {active: true});
    const tab = await chrome.tabs.get(args.tabId);
    if (tab.windowId) {
      await chrome.windows.update(tab.windowId, {focused: true});
    }
    return {tabId: args.tabId, message: `Switched to tab ${args.tabId}`};
  });
}
