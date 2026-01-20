import { registerAgents } from '../agentManager';
import { registerSkillTool } from '../skillManager';
import { registerBashTool } from './bash';
import { registerBashOutputTool } from './bashOutput';
import { registerEditTool } from './edit';
import { registerGlobTool } from './glob';
import { registerGrepTool } from './grep';
import { registerReadTool } from './read';
import { registerWebSearchTool } from './webSearch';
import { registerWriteTool } from './write';

export function initializeTools(): void {
  registerBashTool();
  registerBashOutputTool();
  registerEditTool();
  registerGlobTool();
  registerGrepTool();
  registerReadTool();
  registerWebSearchTool();
  registerWriteTool();
  registerAgents();
  registerSkillTool();
}
