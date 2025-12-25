import Handlebars from 'handlebars';
import { AgentDefinition } from '../types/agent';
import { StreamCallbacks } from '../types/streamCallbacks';
import { ToolHandlerResult } from '../types/tool';
import { runConversation } from './chatOrchestrator';
import { getAgentModel, loadOmxConfig, modelConfigToAppConfig } from './configManager';
import { addUserMessage, createSession } from './sessionManager';

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
  const session = createSession();
  const omxConfig = loadOmxConfig();
  const agentModel = getAgentModel(omxConfig);
  if (!agentModel) {
    throw new Error('No models configured');
  }
  const appConfig = modelConfigToAppConfig(agentModel, true, false, false);
  const userMessage = interpolatePrompt(agent.promptTemplate, params);
  const sessionWithMessage = addUserMessage(session, userMessage, appConfig.provider);

  const result = await runConversation(
    sessionWithMessage,
    callbacks,
    signal,
    {includeAgents: false, includeMcp: true, allowedTools: agent.allowedTools || null},
    appConfig,
    true,
  );

  const lastMessage = result.messages[result.messages.length - 1];
  let displayText = '';

  if (appConfig.provider === 'anthropic') {
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
