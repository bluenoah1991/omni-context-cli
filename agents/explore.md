---
name: explore
description: Gives you a bird's-eye view of project structure, file organization, and overall architecture. Use this to understand where features live and how the codebase is laid out. Not for deep code analysis.
allowedTools: [read, glob, grep, bash, bashOutput]
parameters:
  properties:
    query:
      type: string
      description: What aspect of the project structure to explore
  required: [query]
---

Explore: {{query}}

Use glob to survey the file structure and identify relevant areas. Use grep to scan for where functionality lives. Focus on the big picture—what directories exist, how the project is organized, where different concerns are separated.

Return a report covering:
- Relevant directories and their purposes
- Key files and their roles
- How the codebase is organized (features, layers, modules)
- Where the queried functionality lives

Keep code excerpts minimal—just enough to identify locations and responsibilities.
