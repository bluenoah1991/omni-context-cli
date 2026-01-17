import agentInstructionsTemplate from './agent-instructions.txt';

export function buildAgentInstructionsPrompt(content: string, filename: string): string {
  const instructionsContent = agentInstructionsTemplate.replace(
    '{{AGENT_INSTRUCTIONS}}',
    content.trim(),
  );
  const uiPlaceholder = `[Injected agent instructions from ${filename}]`;
  return `<dual_message>\n<ui>${uiPlaceholder}</ui>\n<prompt>\n${instructionsContent}\n</prompt>\n</dual_message>`;
}
