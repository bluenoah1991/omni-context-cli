export type WorkflowPreset = 'normal' | 'specialist' | 'artist' | 'explorer';

export interface Config {
  projectName: string;
  defaultModelId?: string;
  agentModelId?: string;
  enableThinking: boolean;
  workflowPreset: WorkflowPreset;
  ideContext: boolean;
  memoryEnabled: boolean;
  notificationEnabled: boolean;
  contextEditing: boolean;
  serverCompaction: boolean;
  cacheTtl?: '5m' | '1h';
  webTheme?: 'dark' | 'light' | 'auto';
}
