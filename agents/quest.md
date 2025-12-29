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
      description: What result you expect—like "latest version number", "list of best practices", "comparison of approaches", or "code examples".
  required: [query, expectedResult]
---

Query: {{query}}
Expected result: {{expectedResult}}

Use available web search tools and external knowledge bases to research the query. Gather information from multiple sources if needed for a comprehensive answer.

Extract and return the result according to the expected result description in this exact format:
```
Result: [extracted result matching the expected result description]
```

If sources are relevant, you may include them in a brief format:
```
Result: [extracted result matching the expected result description]
Sources: [brief list of sources if relevant]
```

If the research cannot find relevant information, return:
```
Not found: [brief explanation of what was searched]
```

Do not include explanations beyond the result format. Keep responses concise and structured.
