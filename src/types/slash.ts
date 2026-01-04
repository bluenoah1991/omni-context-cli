export interface SlashCommand {
  name: string;
  description: string;
  type: 'functional' | 'prompt' | 'other';
  prompt?: string;
  execute?: () => SlashHandlerResult;
}

export type SlashHandlerResult = {message?: string;};
