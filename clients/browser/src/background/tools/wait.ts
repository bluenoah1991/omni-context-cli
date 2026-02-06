import { registerTool } from '../toolManager';

export function registerWaitTool(): void {
  registerTool({
    name: 'Wait',
    description: 'Wait for a specified number of seconds before continuing.',
    parameters: {
      properties: {seconds: {type: 'number', description: 'The number of seconds to wait.'}},
      required: ['seconds'],
    },
  }, async (args: {seconds: number;}) => {
    const milliseconds = args.seconds * 1000;
    await new Promise(resolve => setTimeout(resolve, milliseconds));
    return {message: `Waited for ${args.seconds} second(s)`, duration: args.seconds};
  });
}
