import { useChatStore } from '../store/chatStore';
import { SlashHandlerResult } from '../types/slash';
import { getAgentModel, getCurrentModel, getDefaultModel, loadAppConfig } from './configManager';

export const functionalSlashHandlers: Record<string, () => SlashHandlerResult> = {
  clear: handleClear,
  status: handleStatus,
};

function handleClear(): SlashHandlerResult {
  process.stdout.write('\x1Bc');
  useChatStore.getState().createNewSession();
  return {};
}

function handleStatus(): SlashHandlerResult {
  const config = loadAppConfig();
  const currentModel = getCurrentModel();
  const defaultModel = getDefaultModel(config);
  const agentModel = getAgentModel(config);
  const session = useChatStore.getState().session;

  const lines: string[] = [];

  lines.push(`Session ID: ${session.id}`);
  lines.push(`cwd: ${process.cwd()}`);
  lines.push('');

  if (currentModel) {
    lines.push(`Model: ${currentModel.nickname || currentModel.name}`);
    lines.push(`API type: ${currentModel.provider}`);
    lines.push(`API URL: ${currentModel.apiUrl}`);
    lines.push(`Context size: ${currentModel.contextSize}k`);
  } else {
    lines.push('Model: Not configured');
  }

  if (agentModel && agentModel.id !== currentModel?.id) {
    lines.push(`Agent model: ${agentModel.nickname || agentModel.name}`);
  }

  lines.push('');
  lines.push(`Thinking mode: ${config.enableThinking ? '√' : '✗'}`);
  lines.push(`Streaming output: ${config.streamingOutput ? '√' : '✗'}`);
  lines.push(`Specialist mode: ${config.specialistMode ? '√' : '✗'}`);
  lines.push(`IDE context: ${config.ideContext ? '√' : '✗'}`);

  return {message: lines.join('\n')};
}
