import { registerBashTool } from './bash';
import { registerBatchTool } from './batch';
import { registerCreateTool } from './create';
import { registerEditTool } from './edit';
import { registerGlobTool } from './glob';
import { registerGrepTool } from './grep';
import { registerListTool } from './list';
import { registerMultiEditTool } from './multiedit';
import { registerPrependTool } from './prepend';
import { registerReadTool } from './read';
import { registerRewriteTool } from './rewrite';
import { registerTodoReadTool, registerTodoWriteTool } from './todo';
import { registerWriteTool } from './write';

export function initializeTools(): void {
  registerReadTool();
  registerBashTool();
  registerCreateTool();
  registerEditTool();
  registerListTool();
  registerPrependTool();
  registerRewriteTool();
  registerWriteTool();
  registerMultiEditTool();
  registerGlobTool();
  registerGrepTool();
  registerTodoReadTool();
  registerTodoWriteTool();
  registerBatchTool();
}
