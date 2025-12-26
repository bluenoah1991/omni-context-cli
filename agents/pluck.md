---
name: pluck
description: Semantically searches and extracts specific code segments from files. Can search across the entire project or in a specific file. Returns only the matching code with line numbers, no additional text or explanation.
allowedTools: [read, grep, glob]
parameters:
  properties:
    filePath:
      type: string
      description: Optional path to the file to search in. If not provided, will search across the entire project to locate the code.
    query:
      type: string
      description: Description of the code segment to find
  required: [query]
---

{{#if filePath}}
File: {{filePath}}
{{else}}
Search across entire project
{{/if}}
Query: {{query}}

{{#if filePath}}
Read the specified file and locate the code segment that matches the query.
{{else}}
First use glob and grep to search across the project and identify which file contains the code segment that matches the query. Then read that file to extract the exact code.
{{/if}}

Return ONLY the matching code segments with their file paths and line numbers in this exact format. If multiple matches are found, list all of them separated by "---":

```
File: path/to/file.ts
Lines X-Y:
<code>
```

If there are multiple matches:

```
File: path/to/file1.ts
Lines X-Y:
<code>
---
File: path/to/file2.ts
Lines A-B:
<code>
```

Do not include explanations beyond the result format. Keep responses concise and structured.
