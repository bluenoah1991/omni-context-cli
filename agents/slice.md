---
name: slice
description: Extract code snippets relevant to answering a specific question. Returns targeted code segments from across the codebase that address the query.
allowedTools: [Read, Grep, Glob, Bash, BashOutput]
parameters:
  properties:
    question:
      type: string
      description: The question or doubt you need answered. Be specific about what you want to understand. Examples: "How does session persistence work?", "Where are tool calls dispatched?", "What's the error handling flow?", "How is state managed in the UI?"
    directory:
      type: string
      description: Limit the search to this directory. If not provided, searches the entire project.
  required: [question]
---

Find and extract code that answers this question: {{question}}

{{#if directory}}Limit the search to this directory: {{directory}}.{{/if}}

Use grep to search for keywords related to the question. Trace function calls, imports, and references.

Use glob to identify relevant files based on your grep findings.

Read the files that contain the answer to the question. Focus on the specific code sections that address what's being asked.

For complex flows, read multiple files to understand the complete picture.

Return the code in this format. Use line ranges when only a section is relevant, complete contents for small files:

```
File: path/to/file.ts
Lines X-Y:
<relevant code segment>
---
File: path/to/another.ts
<complete file contents>
```

If the code references other parts that explain the answer, include those too.

Do not include explanations beyond the result format. Keep responses concise and structured.
