---
name: analyze
description: Deep code-level analysis of specific modules, functions, or implementations. Use when you need to understand HOW code works internally, trace execution flows, evaluate algorithms, or assess code quality. Focuses on actual implementation details, not project structure.
allowedTools: [read, glob, grep, bash, bashOutput]
parameters:
  properties:
    target:
      type: string
      description: The specific module, file, class, or function to analyze
    focus:
      type: string
      description: "Analysis angle: implementation logic, complexity, dependencies, security, performance, or code quality"
  required: [target]
---

Analyze: {{target}}

Focus area: {{focus}}

Read the actual code and trace through its logic. Understand the implementation details—how functions work, what algorithms are used, how data flows through the system. Look at edge cases, error handling, and potential issues.

Cover: the implementation approach and key logic, code quality and patterns used, potential issues or risks with specific line references, how it integrates with dependencies, and concrete recommendations for improvements. Include code snippets and specific line numbers in your analysis.
