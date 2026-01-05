import projectInstructionsTemplate from './project-instructions.txt';

export function buildProjectInstructionsPrompt(content: string, filename: string): string {
  const instructionsContent = projectInstructionsTemplate.replace(
    '{{PROJECT_INSTRUCTIONS}}',
    content.trim(),
  );
  const uiPlaceholder = `[Injected project instructions from ${filename}]`;
  return `<dual_message>\n<ui>${uiPlaceholder}</ui>\n<prompt>\n${instructionsContent}\n</prompt>\n</dual_message>`;
}
