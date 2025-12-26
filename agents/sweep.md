---
name: sweep
description: Find files matching search criteria. Returns file paths only, doesn't read contents.
allowedTools: [glob, grep, read]
parameters:
  properties:
    query:
      type: string
      description: What files to find—like "configuration files", "React components", or "test files for user authentication".
    maxFiles:
      type: number
      description: Maximum number of files to return. Defaults to 50.
  required: [query]
---

Query: {{query}}
Max files to return: {{#if maxFiles}}{{maxFiles}}{{else}}50{{/if}}

Use glob and grep to search across the project for files matching the criteria.

Return ONLY the list of matching file paths in this exact format:

```
path/to/file1.ts
path/to/file2.tsx
path/to/file3.json
```

If more files match than the maximum limit, return the most relevant ones.

Do not include explanations beyond the result format. Keep responses concise and structured.
