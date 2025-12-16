import { registerBashTool } from './bash';
import { registerCreateTool } from './create';
import { registerEditTool } from './edit';
import { registerListTool } from './list';
import { registerPrependTool } from './prepend';
import { registerReadTool } from './read';
import { registerRewriteTool } from './rewrite';

export function initializeTools(): void {
  registerReadTool();
  registerBashTool();
  registerCreateTool();
  registerEditTool();
  registerListTool();
  registerPrependTool();
  registerRewriteTool();
}
