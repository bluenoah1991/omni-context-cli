---
name: fix
description: Diagnoses and repairs bugs, errors, or broken functionality. Give it the symptom or error message and let it trace the root cause and apply the fix. Handles the detective work and surgery.
allowedTools: [read, glob, grep, write, edit, bash, bashOutput]
parameters:
  properties:
    issue:
      type: string
      description: The bug, error message, or broken behavior to fix
    hints:
      type: string
      description: Any clues—stack traces, reproduction steps, or suspected areas
  required: [issue]
---

Fix this issue: {{issue}}

Available clues: {{hints}}

Start by understanding what the expected behavior is versus what's actually happening. Trace the error path to locate the root cause, check for related issues or side effects, then implement a targeted fix.

Address the root cause rather than just symptoms. Preserve existing behavior elsewhere and consider edge cases. Keep the fix minimal and surgical.

Report your root cause analysis, what was broken and why, the fix you applied, which files were modified, and any related issues you discovered.
