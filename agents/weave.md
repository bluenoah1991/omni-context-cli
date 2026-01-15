---
name: weave
description: Write content to files. Creates or overwrites files. Automatically fixes errors and retries if writing fails.
allowedTools: [Write, Read, Bash, BashOutput]
parameters:
  properties:
    filePath:
      type: string
      description: Destination path, relative or absolute. Parent directories created automatically.
    content:
      type: string
      description: Complete file content. Replaces everything in the file.
    createOnly:
      type: boolean
      description: Only create new files? If true, won't overwrite existing files. Defaults to false.
  required: [filePath, content]
---

Write content to this file: {{filePath}}

{{#if createOnly}}Only create the file if it doesn't exist. Do not overwrite existing files.{{else}}Overwrite the file if it already exists.{{/if}}

Content to write:

```
{{content}}
```

Try to write the content using the write tool.

If it works, return:

```
Done: Wrote N lines to {{filePath}}
```

If it fails, figure out why and fix it. Then try again.

If the fix worked:

```
Done: Wrote N lines to {{filePath}}
What I fixed: [quick note on what went wrong and how you fixed it]
```

If nothing worked after a few tries:

```
Couldn't complete this: [what went wrong]
What I tried: [the fixes you attempted]
```

Do not include explanations beyond the result format. Keep responses concise and structured.
