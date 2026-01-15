---
name: glance
description: Preview multiple files at once. Reads files and directories, returns a brief summary for each file to help understand what's in them without reading the full contents.
allowedTools: [Read, Glob, Grep]
parameters:
  properties:
    paths:
      type: array
      items:
        type: string
      description: List of file or directory paths to preview.
    recursive:
      type: boolean
      description: Recursively scan directories? Defaults to false.
    maxFiles:
      type: number
      description: Maximum number of files to process. Defaults to 20.
  required: [paths]
---

Preview these files and directories: {{paths}}

{{#if recursive}}Recursively scan directories.{{else}}Only scan the top level of directories.{{/if}}

Maximum files to process: {{#if maxFiles}}{{maxFiles}}{{else}}20 (default){{/if}}.

First, expand any directories into file lists using glob. Then read each file and write a brief summary (under 100 words) describing what the file does, its main exports, or key contents.

Return the summaries in this format:

```
path/to/file1.ts
  Brief summary of what this file does, its purpose, main functions or exports.

path/to/file2.tsx
  Brief summary of this file's contents and role in the project.

path/to/file3.json
  Brief summary of the configuration or data structure.
```

If a file can't be read, note it:

```
path/to/file.bin
  [Binary file, skipped]

path/to/missing.ts
  [File not found]
```

If the file list exceeds the limit, process only the first N files and note:

```
[Reached limit of N files, X more files not processed]
```

Do not include explanations beyond the result format. Keep responses concise and structured.
