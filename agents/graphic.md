---
name: graphic
description: Generate a diagram for a feature or module. Creates flowchart, dependency graph, class diagram, or sequence diagram in Mermaid format.
allowedTools: [Read, Grep, Glob]
parameters:
  properties:
    target:
      type: string
      description: The feature, module, or component to diagram
    diagramType:
      type: string
      description: Type of diagram—flowchart, dependency, class, or sequence
  required: [target, diagramType]
---

Target: {{target}}
Diagram type: {{diagramType}}

First, locate all files related to the target feature or module using glob and grep.

Analyze the code structure to understand the architecture and relationships.

{{#if (eq diagramType "flowchart")}}
Generate a flowchart showing the logic flow and decision points:

```mermaid
flowchart TD
    [diagram code]
```

Include a brief description explaining the flow.
{{/if}}

{{#if (eq diagramType "dependency")}}
Generate a dependency graph showing how modules depend on each other:

```mermaid
graph LR
    [diagram code]
```

Include a brief description explaining the dependencies.
{{/if}}

{{#if (eq diagramType "class")}}
Generate a class diagram showing class structure and relationships:

```mermaid
classDiagram
    [diagram code]
```

Include a brief description explaining the class architecture.
{{/if}}

{{#if (eq diagramType "sequence")}}
Generate a sequence diagram showing interaction flow between components:

```mermaid
sequenceDiagram
    [diagram code]
```

Include a brief description explaining the interaction sequence.
{{/if}}

Keep the diagram focused and readable—show the most important elements, not every detail.
