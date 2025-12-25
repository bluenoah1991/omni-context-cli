import { getTask } from '../taskManager';
import { registerTool } from '../toolExecutor';

const MAX_OUTPUT_LENGTH = 30000;

export function registerBashOutputTool(): void {
  registerTool({
    name: 'bashOutput',
    description:
      'Check on a background task by its ID. Returns current stdout, stderr, and exit code if done. Good for monitoring long-runners and verifying completion.',
    formatCall: (args: Record<string, unknown>) => String(args.taskId || ''),
    parameters: {
      properties: {
        taskId: {
          type: 'string',
          description:
            'Task ID from when you started the background command (format: task_TIMESTAMP_RANDOM)',
        },
      },
      required: ['taskId'],
    },
  }, async (args: {taskId: string;}) => {
    const {taskId} = args;

    if (!taskId) {
      throw new Error('Need a taskId. Which background task do you want to check?');
    }

    const taskData = getTask(taskId);
    if (!taskData) {
      throw new Error(`Task '${taskId}' not found. Maybe it was cleaned up, or it never existed?`);
    }

    const isRunning = taskData.exitCode === null;
    const runningTime = isRunning
      ? Date.now() - taskData.startTime
      : (taskData.endTime || Date.now()) - taskData.startTime;

    let output = '';

    if (taskData.stdout) {
      output += taskData.stdout;
    }

    if (taskData.stderr) {
      output += (output ? '\n\n' : '') + `STDERR:\n${taskData.stderr}`;
    }

    if (output.length > MAX_OUTPUT_LENGTH) {
      output = output.substring(0, MAX_OUTPUT_LENGTH)
        + `\n\n[Truncated at ${MAX_OUTPUT_LENGTH} chars of ${output.length}]`;
    }

    const statusInfo = isRunning
      ? `Running (${Math.round(runningTime / 1000)}s so far)`
      : `Done with exit code ${taskData.exitCode} (took ${Math.round(runningTime / 1000)}s)`;

    return {
      result: `${statusInfo}\n\nOutput:\n${output || '(nothing yet)'}`,
      displayText: 'Got task output',
    };
  });
}
