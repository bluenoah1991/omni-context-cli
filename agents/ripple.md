---
name: ripple
description: Finds all locations where a specified symbol (function, method, class, interface, etc.) is referenced. Returns code snippets of each reference site with configurable context lines.
allowedTools: [read, grep, glob]
parameters:
  properties:
    filePath:
      type: string
      description: Path to the file containing the symbol definition
    symbolName:
      type: string
      description: Name of the symbol to find references for (function, class, interface, variable, etc.)
    symbolType:
      type: string
      description: Optional type of the symbol (function, class, interface, variable, etc.) to help narrow down the search
    contextLines:
      type: number
      description: Number of lines to include before and after each reference site (default 5)
  required: [filePath, symbolName]
---

File: {{filePath}}
Symbol: {{symbolName}}{{#if symbolType}} ({{symbolType}}){{/if}}

Use grep and glob to search across the project for all locations where the specified symbol is referenced.

For each reference site found, read the file and extract the code snippet including {{#if contextLines}}{{contextLines}}{{else}}5{{/if}} lines before and after the reference.

Return the reference sites in this exact format. For each location found, include:

```
File: path/to/file.ts
Lines X-Y:
<code>
```

If multiple reference sites are found, separate each with "---":

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
