import { registerTool } from '../toolExecutor';

interface Todo {
  id: number;
  content: string;
  status: 'not_started' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
}

const sessionTodos = new Map<string, Todo[]>();

function getSessionId(): string {
  return 'default';
}

export function registerTodoReadTool(): void {
  registerTool({
    name: 'todoread',
    description:
      `Use this tool to read the current to-do list for the session. This tool should be used proactively and frequently to ensure that you are aware of the status of the current task list. You should make use of this tool as often as possible, especially in the following situations:
- At the beginning of conversations to see what's pending
- Before starting new tasks to prioritize work
- When the user asks about previous tasks or plans
- Whenever you're uncertain about what to do next
- After completing tasks to update your understanding of remaining work
- After every few messages to ensure you're on track

Usage:
- This tool takes in no parameters. Leave the input blank or empty.
- Returns a list of todo items with their status, priority, and content
- Use this information to track progress and plan next steps
- If no todos exist yet, an empty list will be returned`,
    parameters: {properties: {}, required: []},
  }, async () => {
    const sessionId = getSessionId();
    const todos = sessionTodos.get(sessionId) || [];

    return {content: JSON.stringify(todos, null, 2), todos};
  });
}

export function registerTodoWriteTool(): void {
  registerTool({
    name: 'todowrite',
    description:
      `Use this tool to create and manage a structured task list for your current coding session. This helps you track progress, organize complex tasks, and demonstrate thoroughness to the user. It also helps the user understand the progress of the task and overall progress of their requests.

When to Use This Tool:
1. Complex multi-step tasks - When a task requires 3 or more distinct steps or actions
2. Non-trivial and complex tasks - Tasks that require careful planning or multiple operations
3. User explicitly requests todo list - When the user directly asks you to use the todo list
4. User provides multiple tasks - When users provide a list of things to be done (numbered or comma-separated)
5. After receiving new instructions - Immediately capture user requirements as todos
6. After completing a task - Mark it complete and add any new follow-up tasks
7. When you start working on a new task, mark the todo as in_progress. Ideally you should only have one todo as in_progress at a time

When NOT to Use This Tool:
Skip using this tool when:
1. There is only a single, straightforward task
2. The task is trivial and tracking it provides no organizational benefit
3. The task can be completed in less than 3 trivial steps
4. The task is purely conversational or informational

Todo Item Structure:
- id: number - Unique identifier for the todo
- content: string - Description of the task
- status: 'not_started' | 'in_progress' | 'completed'
- priority: 'low' | 'medium' | 'high' (optional)

Example Usage:
{
  "todos": [
    {"id": 1, "content": "Read config file", "status": "completed", "priority": "high"},
    {"id": 2, "content": "Parse configuration", "status": "in_progress", "priority": "high"},
    {"id": 3, "content": "Validate settings", "status": "not_started", "priority": "medium"}
  ]
}`,
    parameters: {
      properties: {
        todos: {
          type: 'array',
          description: 'The updated todo list',
          items: {
            type: 'object',
            properties: {
              id: {type: 'number', description: 'Unique identifier for the todo'},
              content: {type: 'string', description: 'Description of the task'},
              status: {
                type: 'string',
                enum: ['not_started', 'in_progress', 'completed'],
                description: 'Current status of the todo',
              },
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
                description: 'Priority level (optional)',
              },
            },
            required: ['id', 'content', 'status'],
          },
        },
      },
      required: ['todos'],
    },
  }, async (args: {todos: Todo[];}) => {
    const {todos} = args;

    if (!todos || !Array.isArray(todos)) {
      throw new Error('todos array is required');
    }

    const sessionId = getSessionId();
    sessionTodos.set(sessionId, todos);

    const notCompleted = todos.filter(t => t.status !== 'completed').length;

    return {
      content: `Updated todo list: ${notCompleted} active todos, ${
        todos.length - notCompleted
      } completed`,
      todos,
    };
  });
}
