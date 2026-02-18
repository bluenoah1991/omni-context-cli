import TurndownService from 'turndown';
import { registerTool } from '../toolExecutor';
import USER_AGENT from './webfetch-ua.txt';

const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;
const DEFAULT_TIMEOUT = 30;
const MAX_TIMEOUT = 120;

const BASE_HEADERS = {
  'User-Agent': USER_AGENT.trim(),
  Accept: 'text/html,application/xhtml+xml,text/plain,text/markdown,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

const turndown = new TurndownService({headingStyle: 'atx', codeBlockStyle: 'fenced'});
turndown.remove(['script', 'style', 'meta', 'link', 'noscript']);

function extractContent(body: string, mime: string): string {
  const isHtml = mime === 'text/html' || mime === 'application/xhtml+xml';
  if (!isHtml) return body;
  return turndown.turndown(body);
}

export function registerWebFetchTool(): void {
  registerTool({
    name: 'WebFetch',
    builtin: true,
    description:
      'Fetch content from a URL and return it in a readable format. Great for reading documentation, GitHub READMEs, API references, changelogs, or any web page when you have a direct link. HTML is automatically converted to clean markdown. Unlike WebSearch, this fetches the actual page content with no API key required.',
    formatCall: (args: Record<string, unknown>) => String(args.url || ''),
    parameters: {
      properties: {
        url: {
          type: 'string',
          description: 'The URL to fetch. Must start with http:// or https://.',
        },
        timeout: {
          type: 'number',
          description: `Timeout in seconds. Max ${MAX_TIMEOUT}. Default: ${DEFAULT_TIMEOUT}.`,
        },
      },
      required: ['url'],
    },
  }, async (args: {url: string; timeout?: number;}, signal?: AbortSignal) => {
    const {url, timeout = DEFAULT_TIMEOUT} = args;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('URL must start with http:// or https://');
    }

    const timeoutMs = Math.min(timeout * 1000, MAX_TIMEOUT * 1000);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    signal?.addEventListener('abort', () => controller.abort(), {once: true});

    try {
      const response = await fetch(url, {signal: controller.signal, headers: BASE_HEADERS});

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
        throw new Error('Response too large (exceeds 5MB limit)');
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_RESPONSE_SIZE) {
        throw new Error('Response too large (exceeds 5MB limit)');
      }

      const mime = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      const isImage = mime.startsWith('image/') && mime !== 'image/svg+xml';

      if (isImage) {
        const base64 = Buffer.from(buffer).toString('base64');
        const sizeKB = Math.round(buffer.byteLength / 1024);
        return {
          result: `Image from ${url} (${mime}, ${sizeKB}KB)`,
          displayText: `Fetched image (${sizeKB}KB)`,
          dataUrl: `data:${mime};base64,${base64}`,
        };
      }

      const body = new TextDecoder('utf-8').decode(buffer);
      const content = extractContent(body, mime);
      const sizeKB = Math.round(buffer.byteLength / 1024);
      return {result: content, displayText: `Fetched ${sizeKB}KB from ${url}`};
    } finally {
      clearTimeout(timer);
    }
  });
}
