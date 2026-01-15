---
name: pluck
description: Find and extract specific code segments. Searches project-wide or in a single file. Returns matching code with line numbers only.
allowedTools: [Read, Grep, Glob]
parameters:
  properties:
    query:
      type: string
      description: What code segment to find
    filePath:
      type: string
      description: Path to search within. If not provided, searches across the entire project.
  required: [query]
---

Find and extract this code segment: {{query}}

{{#if filePath}}
Search within this file: {{filePath}}. Read the file and locate the code segment that matches the query.
{{else}}
Search across the entire project. Use glob and grep to identify which files contain matching code, then read those files to extract the exact segments.
{{/if}}

Return what you find in this format:

```
File: path/to/file.ts
Lines X-Y:
<the matching code>
```

If there are multiple matches, separate them like this:

```
File: path/to/file1.ts
Lines X-Y:
<the matching code>
---
File: path/to/file2.ts
Lines A-B:
<the matching code>
```

If you can't find what was asked for:

```
Couldn't find it: [brief explanation of what you searched and why nothing matched]
```

Do not include explanations beyond the result format. Keep responses concise and structured.
