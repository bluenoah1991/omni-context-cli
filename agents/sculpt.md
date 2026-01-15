---
name: sculpt
description: Edit files by replacing text. Automatically fixes matching errors and retries if the edit fails.
allowedTools: [Edit, Read, Grep]
parameters:
  properties:
    filePath:
      type: string
      description: File to edit, relative or absolute path.
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

Edit this file by replacing text: {{filePath}}

{{#if replaceAll}}Replace all occurrences of the old text.{{else}}Replace only the first occurrence.{{/if}}

Old text to find and replace:

```
{{oldString}}
```

New text to insert:

```
{{newString}}
```

Try to make the edit using the edit tool.

If it works, return:

```
Done: Edited {{filePath}}
```

If it fails, figure out why. Maybe the text doesn't match exactly, or there's a whitespace issue. Fix it and try again.

If the fix worked:

```
Done: Edited {{filePath}}
What I fixed: [quick note on what was off and how you corrected it]
```

If nothing worked after a few tries:

```
Couldn't complete this: [what went wrong]
What I tried: [the fixes you attempted]
```

Do not include explanations beyond the result format. Keep responses concise and structured.
