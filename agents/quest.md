---
name: quest
description: Research topics using web search and external knowledge bases. Returns information matching what you need to know.
allowedTools: []
parameters:
  properties:
    query:
      type: string
      description: What to research.
    expectedResult:
      type: string
      description: What result you expect, like "latest version number", "list of best practices", "comparison of approaches", or "code examples".
  required: [query, expectedResult]
---

Research this topic: {{query}}

Expected result: {{expectedResult}}.

Use available web search tools and external knowledge bases to find the answer.

Gather information from multiple sources if needed for a comprehensive result.

Return what you find in this format:

```
Here's what I found: [the result matching what was expected]
```

If sources are worth mentioning:

```
Here's what I found: [the result matching what was expected]

Sources:
- [source 1]
- [source 2]
```

If you couldn't find relevant information:

```
Couldn't find this: [brief explanation of what you searched and why nothing turned up]
```

Do not include explanations beyond the result format. Keep responses concise and structured.
