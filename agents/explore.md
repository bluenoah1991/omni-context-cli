---
name: explore
description: High-level project exploration for understanding file structure, module organization, and overall architecture. Use when you need a bird's-eye view of the codebase layout, finding where features live, or mapping out the project structure. NOT for deep code analysis.
allowedTools: [read, glob, grep, bash, bashOutput]
parameters:
  properties:
    query:
      type: string
      description: What aspect of the project structure to explore
  required: [query]
---

Explore: {{query}}

Use glob to survey the file structure and identify relevant areas. Use grep to quickly scan for where functionality lives across the codebase. Focus on the big picture—what directories exist, how the project is organized, where different concerns are separated.

Your report should cover: the relevant directories and their purposes, key files and their roles in the architecture, how the codebase is organized (features, layers, modules), and where the queried functionality or concern is located. Keep code excerpts minimal—just enough to identify locations and responsibilities.
