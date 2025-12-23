import { getTask } from '../taskManager';
import { registerTool } from '../toolExecutor';

const MAX_OUTPUT_LENGTH = 30000;

export function registerBashOutputTool(): void {
  registerTool({
    name: 'bashOutput',
    description:
      'Retrieve the output of a background bash task by its task ID. Use this for: checking the status of long-running commands, retrieving output from background tasks, or verifying task completion. Returns the current stdout, stderr, and exit code (if the task has completed).',
    formatCall: (args: Record<string, unknown>) => String(args.taskId || ''),
    parameters: {
      properties: {
        taskId: {
          type: 'string',
          description:
            'The task ID returned when starting a background bash command. Format: task_TIMESTAMP_RANDOM',
        },
      },
      required: ['taskId'],
    },
  }, async (args: {taskId: string;}) => {
    const {taskId} = args;

    if (!taskId) {
      throw new Error(
        'Missing required parameter: taskId. Please provide the task ID of the background task.',
      );
    }

    const taskData = getTask(taskId);
    if (!taskData) {
      throw new Error(
        `Task ID '${taskId}' not found. The task may have been cleaned up or never existed.`,
      );
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
        + `\n\n[Output truncated at ${MAX_OUTPUT_LENGTH} chars. Total: ${output.length} chars]`;
    }

    const statusInfo = isRunning
      ? `Status: Running (${Math.round(runningTime / 1000)}s elapsed)`
      : `Status: Completed with exit code ${taskData.exitCode} (ran for ${
        Math.round(runningTime / 1000)
      }s)`;

    return {
      result: `${statusInfo}\n\nOutput:\n${output || '(no output yet)'}`,
      displayText: 'Task output retrieved',
    };
  });
}
