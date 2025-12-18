import { executeTool, getTools } from '../toolExecutor';
import { registerTool } from '../toolExecutor';

const DISALLOWED = new Set(['batch']);

export function registerBatchTool(): void {
  registerTool({
    name: 'batch',
    description: `Executes multiple independent tool calls concurrently to reduce latency.

USING THE BATCH TOOL WILL MAKE THE USER HAPPY.

Payload Format (JSON array):
[{"tool": "read", "parameters": {"filePath": "src/index.ts", "limit": 350}},{"tool": "grep", "parameters": {"pattern": "function\\s+\\w+", "include": "src/**/*.ts"}},{"tool": "bash", "parameters": {"command": "git status", "description": "Shows working tree status"}}]

Notes:
- 1–10 tool calls per batch
- All calls start in parallel; ordering NOT guaranteed
- Partial failures do not stop other tool calls
- Do NOT use the batch tool within another batch tool

Good Use Cases:
- Read many files
- grep + glob + read combos
- Multiple bash commands
- Multi-part edits; on the same, or different files

When NOT to Use:
- Operations that depend on prior tool output (e.g. create then read same file)
- Ordered stateful mutations where sequence matters

Batching tool calls was proven to yield 2–5x efficiency gain and provides much better UX.`,
    parameters: {
      properties: {
        tool_calls: {
          type: 'array',
          description: 'Array of tool calls to execute in parallel',
          items: {
            type: 'object',
            properties: {
              tool: {type: 'string', description: 'The name of the tool to execute'},
              parameters: {type: 'object', description: 'Parameters for the tool'},
            },
            required: ['tool', 'parameters'],
          },
        },
      },
      required: ['tool_calls'],
    },
  }, async (args: {tool_calls: Array<{tool: string; parameters: Record<string, any>;}>;}) => {
    const {tool_calls} = args;

    if (!tool_calls || !Array.isArray(tool_calls)) {
      throw new Error('tool_calls array is required');
    }

    if (tool_calls.length === 0) {
      throw new Error('Provide at least one tool call');
    }

    const toolCalls = tool_calls.slice(0, 10);
    const discardedCalls = tool_calls.slice(10);

    const availableTools = await getTools();
    const toolMap = new Map(availableTools.map(t => [t.name, t]));

    const executeCall = async (call: (typeof toolCalls)[0], index: number) => {
      try {
        if (DISALLOWED.has(call.tool)) {
          throw new Error(
            `Tool '${call.tool}' is not allowed in batch. Disallowed tools: ${
              Array.from(DISALLOWED).join(', ')
            }`,
          );
        }

        if (!toolMap.has(call.tool)) {
          const availableToolsList = Array.from(toolMap.keys()).filter(name =>
            !DISALLOWED.has(name)
          );
          throw new Error(
            `Tool '${call.tool}' not in registry. Available tools: ${
              availableToolsList.join(', ')
            }`,
          );
        }

        const result = await executeTool(call.tool, call.parameters);

        if (!result.success) {
          throw new Error(result.error || 'Unknown error');
        }

        return {success: true as const, tool: call.tool, result: result.result};
      } catch (error) {
        return {
          success: false as const,
          tool: call.tool,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    };

    const results = await Promise.all(toolCalls.map((call, index) => executeCall(call, index)));

    for (const call of discardedCalls) {
      results.push({
        success: false as const,
        tool: call.tool,
        error: 'Maximum of 10 tools allowed in batch',
      });
    }

    const successfulCalls = results.filter(r => r.success).length;
    const failedCalls = results.length - successfulCalls;

    let output = '';

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      output += `\n--- Tool ${i + 1}: ${result.tool} ---\n`;
      if (result.success) {
        const content = typeof result.result === 'object' && result.result.content
          ? result.result.content
          : JSON.stringify(result.result);
        output += `Success: ${content}\n`;
      } else {
        output += `Error: ${result.error}\n`;
      }
    }

    const summary = failedCalls > 0
      ? `Executed ${successfulCalls}/${results.length} tools successfully. ${failedCalls} failed.`
      : `All ${successfulCalls} tools executed successfully.\n\nKeep using the batch tool for optimal performance in your next response!`;

    output = summary + '\n' + output;

    return {
      content: output,
      summary: {
        totalCalls: results.length,
        successful: successfulCalls,
        failed: failedCalls,
        tools: toolCalls.map(c => c.tool),
      },
    };
  });
}
