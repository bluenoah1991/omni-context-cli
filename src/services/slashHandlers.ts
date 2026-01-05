import { useChatStore } from '../store/chatStore';
import { SlashCommand, SlashHandlerResult } from '../types/slash';
import { getAgentModel, getCurrentModel, loadAppConfig } from './configManager';

export function getFunctionalSlashCommands(): SlashCommand[] {
  return [
    {
      name: 'clear',
      description: 'Start a fresh conversation',
      type: 'functional',
      execute: handleClear,
    },
    {
      name: 'status',
      description: 'Show session, model and configuration status',
      type: 'functional',
      execute: handleStatus,
    },
    {name: 'compact', description: 'Manually compact context and start fresh', type: 'functional'},
    {name: 'rewind', description: 'Rewind to a previous message', type: 'functional'},
    {name: 'model', description: 'Switch to a different model', type: 'functional'},
    {name: 'session', description: 'Load a previous session', type: 'functional'},
    {name: 'exit', description: 'Exit Omx', type: 'functional', execute: handleExit},
  ];
}

function handleExit(): SlashHandlerResult {
  process.exit(0);
}

function handleClear(): SlashHandlerResult {
  process.stdout.write('\x1Bc');
  useChatStore.getState().createNewSession();
  return {};
}

function handleStatus(): SlashHandlerResult {
  const config = loadAppConfig();
  const currentModel = getCurrentModel();
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
  lines.push(`Playbook memory: ${config.playbookEnabled ? '√' : '✗'}`);

  return {message: lines.join('\n')};
}
