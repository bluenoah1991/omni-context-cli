---
name: ripple
description: Find all references to a symbol (function, class, method, etc.). Returns code snippets showing where it's used with surrounding context.
allowedTools: [read, grep, glob]
parameters:
  properties:
    filePath:
      type: string
      description: Path to the file containing the symbol definition
    symbolName:
      type: string
      description: Name of the symbol to find references for
    symbolType:
      type: string
      description: Type of symbol—function, class, interface, variable, etc. Helps narrow the search.
    contextLines:
      type: number
      description: Lines to include before and after each reference. Defaults to 5.
  required: [filePath, symbolName]
---

File: {{filePath}}
Symbol: {{symbolName}}{{#if symbolType}} ({{symbolType}}){{/if}}

Use grep and glob to search for all places where the symbol is referenced. For each reference found, read the file and extract the code snippet with {{#if contextLines}}{{contextLines}}{{else}}5{{/if}} lines of context before and after.

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
