---
name: craft
description: Executes bash commands with automatic error recovery. If the command fails, analyzes the error and attempts to fix it, then retries. Returns output according to the expected result description.
allowedTools: [bash, bashOutput, read, write]
parameters:
  properties:
    command:
      type: string
      description: Bash command to run. Pipes, redirects, and chains all work.
    expectedResult:
      type: string
      description: Description of what result you expect from running this command (e.g., "list of JavaScript files", "successful installation message", "version number").
    timeout:
      type: number
      description: Max runtime in milliseconds. Default is 120000 (2 minutes).
    workdir:
      type: string
      description: Where to run the command. Can be relative or absolute path. Defaults to current directory.
  required: [command, expectedResult]
---

Command: {{command}}
Expected result: {{expectedResult}}
{{#if timeout}}Timeout: {{timeout}}ms{{/if}}
{{#if workdir}}Working directory: {{workdir}}{{/if}}

First, attempt to execute the command using the bash tool.

If the command succeeds, extract and return the result according to the expected result description in this exact format:
```
Success: [extracted result matching the expected result description]
```

If the command fails, analyze the error and attempt to fix it.

After fixing, retry the command.

If it succeeds after fix, return:
```
Success after fix: [extracted result matching the expected result description]
Fixed issue: [brief description of what was fixed]
```

If all attempts fail, return:
```
Failed: [error description]
Attempted fixes: [what was tried]
```

Do not include explanations beyond the result format. Keep responses concise and structured.
