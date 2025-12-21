import { registerBashTool } from './bash';
import { registerBashOutputTool } from './bashOutput';
import { registerCreateTool } from './create';
import { registerEditTool } from './edit';
import { registerGlobTool } from './glob';
import { registerGrepTool } from './grep';
import { registerListTool } from './list';
import { registerPrependTool } from './prepend';
import { registerReadTool } from './read';
import { registerRewriteTool } from './rewrite';
import { registerWriteTool } from './write';

export function initializeTools(): void {
  registerBashTool();
  registerBashOutputTool();
  registerCreateTool();
  registerEditTool();
  registerGlobTool();
  registerGrepTool();
  registerListTool();
  registerPrependTool();
  registerReadTool();
  registerRewriteTool();
  registerWriteTool();
}
