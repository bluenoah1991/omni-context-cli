import { ChildProcess } from 'child_process';

export interface TaskData {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  startTime: number;
  endTime?: number;
}

const MAX_OUTPUT_PER_STREAM = 10000;
const TASK_CLEANUP_DELAY = 300000;

const backgroundTasks = new Map<string, TaskData>();

export function createTask(childProcess: ChildProcess): string {
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const taskData: TaskData = {stdout: '', stderr: '', exitCode: null, startTime: Date.now()};
  backgroundTasks.set(taskId, taskData);

  childProcess.stdout?.on('data', data => {
    taskData.stdout += data.toString();
    if (taskData.stdout.length > MAX_OUTPUT_PER_STREAM) {
      taskData.stdout = taskData.stdout.slice(-MAX_OUTPUT_PER_STREAM);
    }
  });

  childProcess.stderr?.on('data', data => {
    taskData.stderr += data.toString();
    if (taskData.stderr.length > MAX_OUTPUT_PER_STREAM) {
      taskData.stderr = taskData.stderr.slice(-MAX_OUTPUT_PER_STREAM);
    }
  });

  childProcess.on('close', code => {
    taskData.exitCode = code;
    taskData.endTime = Date.now();
    scheduleTaskCleanup(taskId);
  });

  return taskId;
}

function scheduleTaskCleanup(taskId: string): void {
  setTimeout(() => {
    backgroundTasks.delete(taskId);
  }, TASK_CLEANUP_DELAY);
}

export function getTask(taskId: string): TaskData | undefined {
  return backgroundTasks.get(taskId);
}
