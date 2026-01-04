export interface SlashCommand {
  name: string;
  description: string;
  type: 'functional' | 'prompt';
  prompt?: string;
  execute?: () => SlashHandlerResult;
}

export type SlashHandlerResult = {message?: string;};
