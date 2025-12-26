---
name: sculpt
description: Safely edits a file with automatic error recovery. If the edit fails, analyzes the error and attempts to fix issues like incorrect text matching or whitespace problems, then retries the edit operation.
allowedTools: [edit, read, grep]
parameters:
  properties:
    filePath:
      type: string
      description: File to edit—relative or absolute path.
    oldString:
      type: string
      description: Exact text to replace. Must match perfectly, including whitespace and indentation.
    newString:
      type: string
      description: Replacement text. Use empty string to delete.
    replaceAll:
      type: boolean
      description: Replace all occurrences? Defaults to false (single replacement).
  required: [filePath, oldString, newString]
---

Target file: {{filePath}}
{{#if replaceAll}}
Replace all occurrences.
{{else}}
Replace single occurrence only.
{{/if}}

Old text to replace:
<oldString>
{{oldString}}
</oldString>

New text:
<newString>
{{newString}}
</newString>

First, attempt to edit the file using the edit tool.

If the edit succeeds, return the result immediately in this exact format:
```
Success: Edited /path/to/file
```

If the edit fails, analyze the error and attempt to fix it.

After fixing, retry the edit operation.

If it succeeds, return:
```
Success after fix: Edited /path/to/file
Fixed issue: [brief description of what was fixed]
```

If all attempts fail, return:
```
Failed: [error description]
Attempted fixes: [what was tried]
```

Do not include explanations beyond the result format. Keep responses concise and structured.
