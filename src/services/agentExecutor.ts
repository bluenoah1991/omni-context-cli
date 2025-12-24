import { AgentDefinition } from '../types/agent';
import { StreamCallbacks } from '../types/streamCallbacks';
import { ToolHandlerResult } from '../types/tool';
import { runConversation } from './chatOrchestrator';
import { getAgentModel, loadOmxConfig, modelConfigToAppConfig } from './configManager';
import { addUserMessage, createSession } from './sessionManager';

function interpolatePrompt(template: string, params: Record<string, any>): string {
  let result = template;
  Object.keys(params).forEach(key => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(params[key]));
  });
  return result;
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
  const appConfig = modelConfigToAppConfig(agentModel, true, false);
  const userMessage = interpolatePrompt(agent.promptTemplate, params);
  const sessionWithMessage = addUserMessage(session, userMessage, appConfig.provider);

  try {
    const result = await runConversation(sessionWithMessage, callbacks, signal, {
      includeAgents: false,
      allowedTools: agent.allowedTools || null,
    }, appConfig);

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

    return {
      result: displayText,
      displayText: `Agent ${agent.name} completed: ${displayText.slice(0, 200)}${
        displayText.length > 200 ? '...' : ''
      }`,
    };
  } catch (error) {
    throw error;
  }
}
