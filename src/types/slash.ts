export interface SlashCommand {
  name: string;
  prompt: string;
}

export type SlashHandlerResult = {message?: string;};

export type FunctionalSlashResult = {type: 'functional'; execute: () => SlashHandlerResult;} | {
  type: 'prompt';
  prompt: string;
};
