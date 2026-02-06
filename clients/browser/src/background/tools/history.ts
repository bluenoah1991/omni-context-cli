import { registerTool } from '../toolManager';

interface HistoryItem {
  id: string;
  url?: string;
  title?: string;
  lastVisitTime?: number;
  visitCount?: number;
  typedCount?: number;
}

export function registerHistoryTool(): void {
  registerTool({
    name: 'GetHistory',
    description: 'Retrieve up to 200 most recent browsing history entries.',
    parameters: {properties: {}, required: []},
  }, async () => {
    const historyItems = await chrome.history.search({text: '', maxResults: 200});
    const items: HistoryItem[] = historyItems.map(item => ({
      id: item.id,
      url: item.url,
      title: item.title,
      lastVisitTime: item.lastVisitTime,
      visitCount: item.visitCount,
      typedCount: item.typedCount,
    }));
    return {history: items, count: items.length};
  });
}
