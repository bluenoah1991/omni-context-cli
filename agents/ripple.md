---
name: ripple
description: Find all references to a symbol (function, class, method, etc.). Returns code snippets showing where it's used with surrounding context.
allowedTools: [Read, Grep, Glob]
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
      description: Type of symbol (function, class, interface, variable, etc.). Helps narrow the search.
  required: [filePath, symbolName]
---

Find all references to a symbol in the codebase.

Symbol name: {{symbolName}}.

{{#if symbolType}}Symbol type: {{symbolType}}.{{/if}}

Defined in: {{filePath}}.

Use grep and glob to search for all places where this symbol is referenced.

For each reference found, read the file and extract the code snippet with 5 lines of context before and after.

Return the references in this format:

```
File: path/to/file.ts
Lines X-Y:
<the code with context>
```

If there are multiple references, separate them like this:

```
File: path/to/file1.ts
Lines X-Y:
<the code with context>
---
File: path/to/file2.ts
Lines A-B:
<the code with context>
```

If you can't find any references:

```
No references found: [brief explanation of what you searched]
```

Do not include explanations beyond the result format. Keep responses concise and structured.
