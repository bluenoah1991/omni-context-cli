export async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const [activeTab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!activeTab?.id) {
    throw new Error('No active tab found');
  }
  return activeTab;
}

export async function resolveTabId(tabId?: number): Promise<number> {
  if (tabId) return tabId;
  const tab = await getActiveTab();
  return tab.id!;
}
