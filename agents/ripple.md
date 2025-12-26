---
name: ripple
description: Finds all locations where a specified function/method is called. Returns code snippets of each call site with configurable context lines.
allowedTools: [read, grep, glob]
parameters:
  properties:
    filePath:
      type: string
      description: Path to the file containing the function definition
    functionName:
      type: string
      description: Name of the function to find references for
    contextLines:
      type: number
      description: Number of lines to include before and after each call site (default 5)
  required: [filePath, functionName]
---

File: {{filePath}}
Function: {{functionName}}

Use grep and glob to search across the project for all locations where the specified function is called.

For each call site found, read the file and extract the code snippet including {{#if contextLines}}{{contextLines}}{{else}}5{{/if}} lines before and after the call.

Return the call sites in this exact format. For each location found, include:

```
File: path/to/file.ts
Lines X-Y:
<code>
```

If multiple call sites are found, separate each with "---":

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
