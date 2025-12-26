---
name: sweep
description: Searches for files across the project that match the query criteria. Returns a list of relevant file paths without reading their contents.
allowedTools: [glob, grep, read]
parameters:
  properties:
    query:
      type: string
      description: Description of what files to find (e.g., "configuration files", "React components", "test files for user authentication")
    maxFiles:
      type: number
      description: Maximum number of files to return. Default is 50.
  required: [query]
---

Query: {{query}}
Max files to return: {{#if maxFiles}}{{maxFiles}}{{else}}50{{/if}}

Use glob and grep to search across the entire project and identify files that match the query criteria.

Return ONLY the list of matching file paths in this exact format:

```
path/to/file1.ts
path/to/file2.tsx
path/to/file3.json
```

If more files match than the maximum limit, return the most relevant ones.

Do not include explanations beyond the result format. Keep responses concise and structured.
