import { registerTool } from '../toolManager';

interface BookmarkNode {
  id: string;
  title: string;
  url?: string;
  dateAdded?: number;
  type: 'folder' | 'bookmark';
  children?: BookmarkNode[];
}

function simplifyBookmarkTree(node: chrome.bookmarks.BookmarkTreeNode): BookmarkNode {
  return {
    id: node.id,
    title: node.title,
    type: node.url ? 'bookmark' : 'folder',
    ...(node.url && {url: node.url}),
    ...(node.dateAdded && {dateAdded: node.dateAdded}),
    ...(node.children?.length && {children: node.children.map(simplifyBookmarkTree)}),
  };
}

export function registerBookmarksTool(): void {
  registerTool({
    name: 'GetBookmarks',
    description: 'Retrieve all browser bookmarks in a hierarchical tree structure.',
    parameters: {properties: {}, required: []},
  }, async () => {
    const tree = await chrome.bookmarks.getTree();
    if (!tree || tree.length === 0) {
      return {bookmarks: []};
    }
    const simplifiedTree = tree.map(simplifyBookmarkTree);
    return {bookmarks: simplifiedTree};
  });
}
