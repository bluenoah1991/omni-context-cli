export interface SlashCommand {
  name: string;
  description: string;
  type: 'functional' | 'prompt';
}
