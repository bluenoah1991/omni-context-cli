export interface Config {
  projectName: string;
  defaultModelId?: string;
  agentModelId?: string;
  enableThinking: boolean;
  specialistMode: boolean;
  ideContext: boolean;
  memoryEnabled: boolean;
  notificationEnabled: boolean;
  contextEditing: boolean;
  webTheme?: 'dark' | 'light' | 'auto';
}
