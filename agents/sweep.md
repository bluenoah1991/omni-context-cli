---
name: sweep
description: Find files matching search criteria. Returns file paths only, doesn't read contents.
allowedTools: [Glob, Grep, Read]
parameters:
  properties:
    query:
      type: string
      description: What files to find, like "configuration files", "React components", or "test files for user authentication".
    maxFiles:
      type: number
      description: Maximum number of files to return. Defaults to 50.
  required: [query]
---

Find files in the project that match this criteria: {{query}}

Maximum files to return: {{#if maxFiles}}{{maxFiles}}{{else}}50 (default){{/if}}.

Use glob and grep to search across the project for matching files. Only return file paths, don't read the contents.

Return just the list of matching file paths:

```
path/to/file1.ts
path/to/file2.tsx
path/to/file3.json
```

If more files match than the limit allows, return the most relevant ones.

If you can't find any matching files:

```
Couldn't find any matches: [brief explanation of what you searched]
```

Do not include explanations beyond the result format. Keep responses concise and structured.
