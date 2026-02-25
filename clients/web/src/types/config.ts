export type WorkflowPreset = 'normal' | 'specialist' | 'artist' | 'explorer' | 'assistant';

export interface Config {
  projectName: string;
  defaultModelId?: string;
  agentModelId?: string;
  enableThinking: boolean;
  workflowPreset: WorkflowPreset;
  ideContext: boolean;
  memoryEnabled: boolean;
  contextEditing: boolean;
  serverCompaction: boolean;
  responseLanguage?: 'auto' | 'en' | 'zh';
  cacheTtl?: '5m' | '1h';
  webTheme?: 'dark' | 'light' | 'auto';
  language?: string;
}
