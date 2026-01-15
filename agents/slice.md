---
name: slice
description: Extract all code files and key code segments for a feature module. Returns complete file contents and relevant snippets from other files.
allowedTools: [Read, Grep, Glob, Bash, BashOutput]
parameters:
  properties:
    module:
      type: string
      description: The feature module to extract. Can be a component name or module identifier.
    directory:
      type: string
      description: Limit the search to this directory. If not provided, searches the entire project.
  required: [module]
---

Extract all code for this feature module: {{module}}

{{#if directory}}Limit the search to this directory: {{directory}}.{{/if}}

Start by using glob to find files that belong to this module. Then use grep to trace imports, exports, and references so you understand the full scope.

Read the main implementation files in their entirety. For other files that reference or use this module, extract just the relevant code segments.

Return the code in this format. Use complete contents for main files, line ranges for snippets:

```
File: path/to/main.ts
<complete file contents>
---
File: path/to/another.ts
Lines X-Y:
<code segment>
```

If you can't find the module:

```
Couldn't find this module: [brief explanation of what you searched and why nothing matched]
```

Do not include explanations beyond the result format. Keep responses concise and structured.
