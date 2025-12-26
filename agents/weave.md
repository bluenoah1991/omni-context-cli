---
name: weave
description: Write content to files. Creates or overwrites files. Automatically fixes errors and retries if writing fails.
allowedTools: [write, read, bash, bashOutput]
parameters:
  properties:
    filePath:
      type: string
      description: Destination path—relative or absolute. Parent directories created automatically.
    content:
      type: string
      description: Complete file content. Replaces everything in the file.
    createOnly:
      type: boolean
      description: Only create new files? If true, won't overwrite existing files. Defaults to false.
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
