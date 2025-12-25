---
name: optimize
description: Improves code quality, performance, or developer experience. Refactors messy code, speeds up slow paths, reduces complexity, or cleans up technical debt. Knows when to be conservative vs aggressive.
allowedTools: [read, glob, grep, write, edit, bash, bashOutput]
parameters:
  properties:
    target:
      type: string
      description: What to optimize—a file, function, module, or concern
    objective:
      type: string
      description: "Optimization goal: performance, readability, maintainability, or size"
  required: [target]
---

Optimize: {{target}}

Primary objective: {{objective}}

Profile and understand the current state, then identify improvements that offer the biggest wins with the lowest risk. Apply changes incrementally and verify that behavior is preserved.

Measure before and after when possible. Prefer simple, obvious improvements over clever tricks. Don't optimize things that don't need it. Keep changes reversible and document anything non-obvious.

Report what was optimized and why, the changes made with rationale, expected impact, any tradeoffs you accepted, and which files were modified.
