---
name: unravel
description: Finds the implementations of key functions/methods called within a specified function. Returns the implementation code of each called function with file paths and line numbers.
allowedTools: [read, grep, glob]
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

First, read the specified file and locate the function implementation. Analyze the function body to identify all function/method calls it makes.

Then, for each significant function call found (ignore built-in functions, standard library calls, and trivial operations):
1. Use grep and glob to locate the implementation of that function
2. Read the file to extract the function implementation code

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
