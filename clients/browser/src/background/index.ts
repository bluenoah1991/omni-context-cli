import { getServerUrl } from './config';
import { connect, getState } from './longPollClient';
import { registerBookmarksTool } from './tools/bookmarks';
import { registerCDPTool } from './tools/cdp';
import { registerExecuteScriptTool } from './tools/executeScript';
import { registerHistoryTool } from './tools/history';
import { registerPageContentTools } from './tools/pageContent';
import { registerScreenshotTool } from './tools/screenshot';
import { registerTabTools } from './tools/tabs';
import { registerWaitTool } from './tools/wait';

chrome.sidePanel.setPanelBehavior({openPanelOnActionClick: true});

registerTabTools();
registerPageContentTools();
registerBookmarksTool();
registerHistoryTool();
registerExecuteScriptTool();
registerWaitTool();
registerScreenshotTool();
registerCDPTool();

connect();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handlers: Record<string, () => Promise<any>> = {
    getStatus: async () => ({baseUrl: getServerUrl(), state: getState()}),
    connect: () => connect(message.url).then(() => ({success: true})),
  };

  const handler = handlers[message.type];
  if (!handler) return false;

  handler().catch(err => ({success: false, error: String(err)})).then(sendResponse);
  return true;
});
