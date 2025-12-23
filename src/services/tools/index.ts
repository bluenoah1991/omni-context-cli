import { registerAppendTool } from './append';
import { registerBashTool } from './bash';
import { registerBashOutputTool } from './bashOutput';
import { registerEditTool } from './edit';
import { registerGlobTool } from './glob';
import { registerGrepTool } from './grep';
import { registerListTool } from './list';
import { registerReadTool } from './read';
import { registerWriteTool } from './write';

export function initializeTools(): void {
  registerAppendTool();
  registerBashTool();
  registerBashOutputTool();
  registerEditTool();
  registerGlobTool();
  registerGrepTool();
  registerListTool();
  registerReadTool();
  registerWriteTool();
}
