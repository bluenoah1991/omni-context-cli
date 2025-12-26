import Handlebars from 'handlebars';
import { AgentDefinition } from '../types/agent';
import { StreamCallbacks } from '../types/streamCallbacks';
import { ToolHandlerResult } from '../types/tool';
import { runConversation } from './chatOrchestrator';
import { getAgentModel, loadAppConfig } from './configManager';
import { addUserMessage, createSession } from './sessionManager';

Handlebars.registerHelper('eq', (a, b) => a === b);

function interpolatePrompt(template: string, params: Record<string, any>): string {
  const compiled = Handlebars.compile(template);
  return compiled(params);
}

export async function executeAgent(
  agent: AgentDefinition,
  params: Record<string, any>,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<ToolHandlerResult> {
  const appConfig = loadAppConfig();

  const agentModel = getAgentModel(appConfig);
  if (!agentModel) {
    throw new Error('Cannot execute agent without a configured model');
  }

  const session = createSession(agentModel);
  const userMessage = interpolatePrompt(agent.promptTemplate, params);
  const sessionWithMessage = addUserMessage(session, userMessage, agentModel.provider);

  const result = await runConversation(
    sessionWithMessage,
    callbacks,
    signal,
    {excludeAgents: true, excludeMcp: false, allowedTools: agent.allowedTools || null},
    agentModel,
    true,
  );

  const lastMessage = result.messages[result.messages.length - 1];
  let displayText = '';

  if (agentModel.provider === 'anthropic') {
    const content = lastMessage.content;
    if (Array.isArray(content)) {
      displayText = content.filter((block: any) => block.type === 'text').map((block: any) =>
        block.text
      ).join('\n');
    }
  } else {
    displayText = String(lastMessage.content || '');
  }

  if (signal?.aborted) {
    throw new Error(`Agent ${agent.name} was interrupted`);
  }

  return {
    result: displayText,
    displayText: `Agent ${agent.name} done: ${displayText.slice(0, 200)}${
      displayText.length > 200 ? '...' : ''
    }`,
  };
}
