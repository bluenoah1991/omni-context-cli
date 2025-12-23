import { registerBashTool } from './bash';
import { registerBashOutputTool } from './bashOutput';
import { registerEditTool } from './edit';
import { registerGlobTool } from './glob';
import { registerGrepTool } from './grep';
import { registerReadTool } from './read';
import { registerWriteTool } from './write';

export function initializeTools(): void {
  registerBashTool();
  registerBashOutputTool();
  registerEditTool();
  registerGlobTool();
  registerGrepTool();
  registerReadTool();
  registerWriteTool();
}
