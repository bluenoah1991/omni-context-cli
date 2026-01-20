import { ModelConfig } from '../../types/config';
import { getAgentModel, loadAppConfig } from '../configManager';
import { saveRequest } from '../diagnostic';
import { registerTool } from '../toolExecutor';

async function performWebSearch(query: string, model: ModelConfig): Promise<string> {
  const request: Record<string, unknown> = {
    model: model.name,
    messages: [{
      role: 'user',
      content: [{type: 'text', text: `Perform a web search for: ${query}`}],
    }],
    stream: false,
    max_tokens: 4096,
    system: [{type: 'text', text: 'You are a helpful assistant performing web searches.'}],
    tools: [{type: 'web_search_20250305', name: 'web_search', max_uses: 5}],
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': model.apiKey,
    'anthropic-version': '2023-06-01',
  };

  saveRequest('websearch', request, true);

  const response = await fetch(model.apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Web search failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const textBlocks: string[] = [];

  if (data.content && Array.isArray(data.content)) {
    for (const block of data.content) {
      if (block.type === 'text' && block.text) {
        textBlocks.push(block.text);
      } else if (block.type === 'web_search_tool_result' && block.content) {
        if (Array.isArray(block.content)) {
          const urls: string[] = [];
          for (const result of block.content) {
            if (result.type === 'web_search_result' && result.url) {
              urls.push(`- ${result.title || 'Untitled'}: ${result.url}`);
            }
          }
          if (urls.length > 0) {
            textBlocks.push('Search Results:\n' + urls.join('\n'));
          }
        }
      }
    }
  }

  if (textBlocks.length === 0) {
    return 'No results found.';
  }

  return textBlocks.join('\n\n');
}

export function registerWebSearchTool(): void {
  registerTool({
    name: 'WebSearch',
    builtin: true,
    description: 'Search the web for up-to-date information. Only works with Anthropic models.',
    formatCall: (args: Record<string, unknown>) => String(args.query || ''),
    parameters: {
      properties: {query: {type: 'string', description: 'The search query.'}},
      required: ['query'],
    },
  }, async (args: {query: string;}) => {
    const model = getAgentModel(loadAppConfig());
    if (!model) {
      throw new Error('No model configured.');
    }

    if (model.provider !== 'anthropic') {
      throw new Error('Web search only available with Anthropic models.');
    }

    const result = await performWebSearch(args.query, model);

    return {result, displayText: 'Search completed.'};
  });
}
