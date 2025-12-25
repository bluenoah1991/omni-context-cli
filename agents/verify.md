---
name: verify
description: Validates that code works correctly through testing, type checking, linting, and manual verification. Use after implement or fix to confirm changes work, or to check existing functionality before modifications.
allowedTools: [read, glob, grep, bash, bashOutput]
parameters:
  properties:
    target:
      type: string
      description: What to verify—a feature, fix, file, or the entire project
    checks:
      type: string
      description: "Specific verifications: tests, types, lint, build, or runtime behavior"
  required: [target]
---

Verify: {{target}}

Focus on these checks: {{checks}}

Figure out what success looks like, then run the appropriate checks—build, lint, tests, type checking. Manually inspect critical paths if needed and check for regressions or side effects.

Consider these check types: Does it build without errors? Any type errors or unsafe casts? Code style issues? Do tests pass and is coverage adequate? Does it actually work correctly at runtime?

Report which checks you performed and the results, any issues found with their severity, what's working correctly, recommendations for additional testing, and your overall confidence level.
