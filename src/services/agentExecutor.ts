import Handlebars from 'handlebars';
import { AgentDefinition } from '../types/agent';
import { ToolHandlerResult } from '../types/tool';
import { extractTextContent } from '../utils/messageUtils';
import { injectAgentInstructions } from './agentInstructionsManager';
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
  signal?: AbortSignal,
): Promise<ToolHandlerResult> {
  const appConfig = loadAppConfig();

  const agentModel = getAgentModel(appConfig);
  if (!agentModel) {
    throw new Error('Cannot execute agent without a configured model');
  }

  const session = createSession(agentModel);
  const sessionWithInstructions = injectAgentInstructions(session, agentModel.provider);
  const userMessage = interpolatePrompt(agent.promptTemplate, params);
  const sessionWithMessage = addUserMessage(
    sessionWithInstructions,
    userMessage,
    agentModel.provider,
  );

  let capturedError: string | null = null;

  const result = await runConversation(
    sessionWithMessage,
    {
      onError: error => {
        capturedError = error;
      },
    },
    signal,
    {excludeAgents: true, excludeMcp: false, allowedTools: agent.allowedTools || null},
    agentModel,
    true,
    false,
    true,
  );

  if (capturedError) {
    throw new Error(capturedError);
  }

  const lastMessage = result.messages[result.messages.length - 1];
  const fullText = extractTextContent(lastMessage);
  let displayText = fullText;
  if (fullText.startsWith('```')) {
    const start = fullText.indexOf('\n') + 1;
    const end = fullText.lastIndexOf('```');
    if (start > 0 && end > start) {
      displayText = fullText.slice(start, end).trim();
    }
  }

  if (signal?.aborted) {
    throw new Error(`Agent ${agent.name} was interrupted`);
  }

  return {
    result: fullText,
    displayText: `Agent ${agent.name} done: ${displayText.slice(0, 200)}${
      displayText.length > 200 ? '...' : ''
    }`,
  };
}
