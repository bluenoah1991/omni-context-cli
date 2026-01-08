---
name: diagnose
description: Get code diagnostics (errors, warnings, hints) for the current project from the IDE.
allowedTools: []
parameters:
  properties:
    uri:
      type: string
      description: Optional file URI to get diagnostics for. If not provided, returns diagnostics for all open files.
  required: []
---

Use the mcp_ide_visual_studio_code_getDiagnostics tool to fetch code diagnostics from the IDE.

{{#if uri}}
Get diagnostics for: {{uri}}
{{else}}
Get diagnostics for all files in the current workspace.
{{/if}}

Return the diagnostics in a clear, structured format:

```
File: [file path]
  Line X: [severity] - [message]
  Line Y: [severity] - [message]

File: [another file path]
  Line Z: [severity] - [message]
```

Group diagnostics by file, sort by line number within each file. If no diagnostics are found, return:
```
No diagnostics found - the code looks clean!
```

For each diagnostic, include the severity (error, warning, info, hint) and the full message. Keep the output concise but complete.
