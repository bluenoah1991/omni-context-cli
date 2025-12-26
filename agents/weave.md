---
name: weave
description: Safely writes content to a file with automatic error recovery. If writing fails, analyzes the error and attempts to fix issues, then retries the write operation.
allowedTools: [write, read, bash, bashOutput]
parameters:
  properties:
    filePath:
      type: string
      description: Destination path. Can be relative or absolute. Parent directories are created automatically.
    content:
      type: string
      description: Complete file content. This replaces everything in the file.
    createOnly:
      type: boolean
      description: Only create new files? If true, refuses to overwrite existing files. Default is false.
  required: [filePath, content]
---

Target file: {{filePath}}
{{#if createOnly}}
Only create new file, do not overwrite if exists.
{{else}}
Overwrite file if it exists.
{{/if}}

Content to write:
<content>
{{content}}
</content>

First, attempt to write the content using the write tool.

If the write succeeds, return the result immediately in this exact format:
```
Success: Wrote N lines to /path/to/file
```

If the write fails, analyze the error and attempt to fix it.

After fixing, retry the write operation.

If it succeeds, return:
```
Success after fix: Wrote N lines to /path/to/file
Fixed issue: [brief description of what was fixed]
```

If all attempts fail, return:
```
Failed: [error description]
Attempted fixes: [what was tried]
```

Do not include explanations beyond the result format. Keep responses concise and structured.
