---
name: unravel
description: Analyze a function to find what it calls, then retrieve the implementation of each called function. Returns the actual code of dependencies.
allowedTools: [Read, Grep, Glob]
parameters:
  properties:
    filePath:
      type: string
      description: Path to the file containing the function to analyze
    functionName:
      type: string
      description: Name of the function to analyze for its internal function calls
  required: [filePath, functionName]
---

File: {{filePath}}
Function: {{functionName}}

Read the file and locate the function. Analyze its body to identify all function calls it makes.

For each significant function call (ignore built-ins, standard library, and trivial operations):
1. Use grep and glob to locate the implementation
2. Read the file to extract the implementation code

Return the implementations in this exact format. For each called function found, include:

```
Function: functionName
File: path/to/file.ts
Lines X-Y:
<code>
```

If multiple functions are called, separate each with "---":

```
Function: firstFunction
File: path/to/file1.ts
Lines X-Y:
<code>
---
Function: secondFunction
File: path/to/file2.ts
Lines A-B:
<code>
```

Do not include explanations beyond the result format. Keep responses concise and structured.
