---
name: craft
description: Execute bash commands when no suitable specialized tool exists. Automatically fixes errors and retries if the command fails.
allowedTools: [Bash, BashOutput, Read, Write]
parameters:
  properties:
    command:
      type: string
      description: Bash command to run. Pipes, redirects, and chains all work.
    expectedResult:
      type: string
      description: What result you expect from this command, like "list of JavaScript files", "successful installation message", or "version number".
    timeout:
      type: number
      description: Max runtime in milliseconds. Defaults to 120000 (2 minutes).
    workdir:
      type: string
      description: Where to run the command, relative or absolute path. Defaults to current directory.
  required: [command, expectedResult]
---

Use the bash tool to run this command: {{command}}

Working directory: {{#if workdir}}{{workdir}}{{else}}current directory{{/if}}.

Timeout: {{#if timeout}}{{timeout}}ms{{else}}120000ms (2 minutes){{/if}}.

Expected result: {{expectedResult}}.

If it works, extract what was asked for and return:

```
Done: [the result matching what was expected]
```

If something goes wrong, figure out why and fix it. Then try again.

If the fix worked, return:

```
Done: [the result matching what was expected]
What I fixed: [quick note on what went wrong and how you fixed it]
```

If nothing worked after a few tries, return:

```
Couldn't complete this: [what went wrong]
What I tried: [the fixes you attempted]
```

Do not include explanations beyond the result format. Keep responses concise and structured.
