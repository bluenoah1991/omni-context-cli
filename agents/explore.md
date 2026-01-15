---
name: explore
description: Survey project structure and architecture. Shows directory layout, where features live, and how the codebase is organized. For structural overview, not detailed analysis.
allowedTools: [Read, Glob, Grep, Bash, BashOutput]
parameters:
  properties:
    query:
      type: string
      description: What aspect of the project structure to explore
    directory:
      type: string
      description: Limit the search to this directory. If not provided, searches the entire project.
  required: [query]
---

Survey the project structure and find out: {{query}}

{{#if directory}}Limit the search to this directory: {{directory}}.{{/if}}

Use glob to survey the file structure and identify relevant areas. Use grep to scan for where functionality lives. 

Focus on the big picture: what directories exist, how the project is organized, where different concerns are separated.

Return a report covering:
- A brief overview of what you found
- Relevant directories and their purposes
- Key files and their roles
- How the codebase is organized (features, layers, modules)
- Where the queried functionality lives

Keep the report concise and to the point. Focus on what matters, skip the fluff.
