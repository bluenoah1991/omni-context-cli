---
name: pluck
description: Find and extract specific code segments from a file. Returns matching code with line numbers only.
allowedTools: [Read]
parameters:
  properties:
    query:
      type: string
      description: What code segment to find, e.g. "the registerTool function implementation", "UserService class definition", "where formatOutput is called", "error handling in the login flow"
    filePath:
      type: string
      description: Exact path to the file to search within.
  required: [query, filePath]
---

Find and extract this code segment: {{query}}

Search within this file: {{filePath}}. 

Read the file and locate the code segment that matches the query.

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
