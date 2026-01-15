---
name: slice
description: Extract code snippets relevant to answering a specific question. Returns targeted code segments from across the codebase that address the query.
allowedTools: [Read, Grep, Glob, Bash, BashOutput]
parameters:
  properties:
    question:
      type: string
      description: What you want to understand. Be specific, like "How does session persistence work?" or "Where are tool calls dispatched?"
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
