---
name: implement
description: Executes feature implementation or code changes. Takes a clear goal and handles all the file creation, editing, and wiring. Use when you know what needs to be built and want it done properly following project conventions.
allowedTools: [read, glob, grep, write, edit, bash, bashOutput]
parameters:
  properties:
    goal:
      type: string
      description: What to implement or change—be specific about the desired outcome
    context:
      type: string
      description: Relevant background info, related files, or constraints to consider
  required: [goal]
---

Implement: {{goal}}

Additional context: {{context}}

Start by understanding the existing patterns and conventions in the codebase. Figure out which files need to be created or modified, then implement the changes systematically while following the project's style. Make sure imports, exports, and wiring are all correct.

Match the existing code style exactly, handle edge cases properly, and keep changes focused. Avoid orphaned code or broken imports.

Report which files you created or modified, the key implementation decisions, any assumptions you made, and integration points that should be verified.
