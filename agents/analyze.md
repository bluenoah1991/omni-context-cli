---
name: analyze
description: Deep-dive analysis of code quality, architecture decisions, and potential issues. Use after explore to evaluate specific components, understand design tradeoffs, or assess technical debt before making changes.
allowedTools: [read, glob, grep, bash, bashOutput]
parameters:
  properties:
    target:
      type: string
      description: The component, pattern, or concern to analyze
    focus:
      type: string
      description: "Analysis angle: architecture, complexity, dependencies, security, or performance"
  required: [target]
---

Analyze: {{target}}

Focus area: {{focus}}

Locate the relevant code and map out its structure and relationships. Look for patterns, anti-patterns, and edge cases. Assess the quality, maintainability, and potential risks.

Cover the current state and how it works, what's well-designed, what needs improvement or poses risks, and how dependencies are structured. Give concrete recommendations prioritized by impact. Be specific with file locations and code references.
