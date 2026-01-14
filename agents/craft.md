---
name: craft
description: Execute bash commands when no suitable specialized tool exists. Automatically fixes errors and retries if the command fails. Returns the result you expect.
allowedTools: [Bash, BashOutput, Read, Write]
parameters:
  properties:
    command:
      type: string
      description: Bash command to run. Pipes, redirects, and chains all work.
    expectedResult:
      type: string
      description: What result you expect from this command—like "list of JavaScript files", "successful installation message", or "version number".
    timeout:
      type: number
      description: Max runtime in milliseconds. Defaults to 120000 (2 minutes).
    workdir:
      type: string
      description: Where to run the command—relative or absolute path. Defaults to current directory.
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
