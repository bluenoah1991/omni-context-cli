- All English copy in the project should be natural, casual, and idiomatic to native English speakers.
- Do not add any code comments or documentation.

# OMX (Omni Context CLI)

A zero-telemetry CLI coding assistant built with React/Ink, supporting multiple LLM providers (Anthropic, OpenAI), extensible via agents, slash commands, and MCP servers.

## Quick Start

```bash
# Install dependencies
npm install

# Development build with watch mode
npm run dev

# Production build
npm run build

# Run the CLI
npm start
# or
node dist/cli.js

# Continue from last session
npm start -- --continue

# Enable diagnostic mode
npm start -- --diagnostic

# Enable cost analysis
npm start -- --cost-analysis

# Format code
npm run format
```

## Architecture

OMX follows a layered architecture:

```
CLI Entry (cli.tsx)
    ↓
UI Layer (Ink/React) - ChatView, InputBox, Menu
    ↓
Service Layer
    ├── chatOrchestrator - Main conversation loop
    ├── agentManager - Loads and executes agents
    ├── toolExecutor - Dispatches tool calls
    ├── mcpManager - MCP server integration
    └── sessionManager - Session persistence
    ↓
Provider Adapters
    ├── anthropic/openaiRequestBuilder - Format API requests
    └── anthropic/openaiStreamHandler - Handle streaming responses
    ↓
Storage/State
    ├── chatStore - Zustand state management
    └── File system - Sessions in ~/.omx/projects/
```

**Key Flows:**
- User input → parse slash commands → build request → stream response → execute tools → update UI
- Tool execution runs in parallel when possible
- Agents are invoked as tools with custom prompts
- MCP servers expose tools prefixed with `mcp_`

## Tech Stack

- **Runtime**: Node.js 18+ (ESM modules)
- **Language**: TypeScript 5.9 (ES2022 target, strict mode)
- **UI Framework**: Ink 6.5 + React 19 (terminal UI)
- **State Management**: Zustand 5
- **LLM Providers**: Anthropic (Claude), OpenAI (GPT-4)
- **Protocol**: MCP (Model Context Protocol) via @modelcontextprotocol/sdk
- **HTTP Client**: Undici (with connection pooling)
- **Build Tool**: esbuild 0.27 (bundles to dist/cli.js)
- **Code Obfuscation**: javascript-obfuscator (production builds only)
- **Templating**: Handlebars (slash commands)
- **File Operations**: glob, gray-matter (frontmatter parsing)
- **Utilities**: figlet, marked (markdown), highlight.js (syntax highlighting)

## Development

### Project Structure

```
omx/
├── src/
│   ├── cli.tsx                    # Entry point, CLI setup
│   ├── services/                  # Core business logic
│   │   ├── chatOrchestrator.ts    # Main conversation orchestration
│   │   ├── agentManager.ts        # Agent loading and execution
│   │   ├── toolExecutor.ts        # Tool registry and dispatcher
│   │   ├── mcpManager.ts          # MCP server lifecycle
│   │   ├── sessionManager.ts      # Session CRUD and persistence
│   │   ├── configManager.ts       # Model configuration and API keys
│   │   ├── slashManager.ts        # Slash command loading
│   │   └── tools/                 # Built-in tool implementations
│   ├── types/                     # TypeScript definitions
│   ├── prompts/                   # System prompt templates
│   ├── store/                     # Zustand state management
│   ├── ui/                        # React/Ink components
│   └── utils/                     # Helper utilities
├── agents/                        # Built-in agent definitions (.md)
├── slash/                         # Built-in slash commands (.md)
├── bin/                           # Embedded ripgrep binaries
├── .omx/                          # User-level config and customizations
├── package.json
├── tsconfig.json
└── build.mjs                      # Build script with esbuild
```

### Adding Tools

Tools are registered in `src/services/tools/index.ts`. Each tool:
1. Calls `registerTool()` with a `ToolDefinition` and `ToolHandler`
2. Implements async execution logic
3. Returns formatted results

Example from `grep.ts`:
```typescript
registerTool({
  name: 'grep',
  description: 'Search file contents using ripgrep',
  parameters: { /* JSON Schema */ },
  formatCall: (params) => `Search: ${params.query}`
}, async (params) => {
  // Implementation
  return results;
});
```

### Adding Agents

Agents are markdown files with YAML frontmatter in `agents/` or `.omx/agents/`:

```markdown
---
name: explore
description: Survey project structure
allowedTools: [Read, Glob, Grep, Bash]
parameters:
  properties:
    query: { type: string, description: "What to explore" }
  required: [query]
---

Explore: {{query}}

Use glob to survey file structure and grep to scan functionality...
```

### Adding Slash Commands

Commands are markdown files in `slash/` or `.omx/slash/` with Handlebars templates:

```markdown
---
description: Echo a message
---
{{#if argument}}{{argument}}{{else}}hello{{/if}}
```

### Configuration Locations

| Config Type | User Level | Project Level |
|-------------|------------|---------------|
| Agents | `~/.omx/agents/` | `.omx/agents/` |
| Slash Commands | `~/.omx/slash/` | `.omx/slash/` |
| MCP Servers | `~/.omx/mcp.json` | `.omx/mcp.json` |
| App Config | `~/.omx/omx.json` | `.omx/omx.json` |
| Skills | `~/.omx/skills/` | `.omx/skills/` |
| Sessions | `~/.omx/projects/<id>/` | - |

**Priority**: Project-level overrides user-level overrides built-in.

### MCP Integration

MCP servers are configured in `~/.omx/mcp.json` or `.omx/mcp.json`. The `mcpManager` connects to servers via stdio or HTTP and exposes their tools as `mcp_<server>_<tool>`.

## Key Files

| File | Purpose |
|------|---------|
| `src/cli.tsx` | Entry point, initializes services and renders UI |
| `src/services/chatOrchestrator.ts` | Main conversation loop, request/response flow |
| `src/services/toolExecutor.ts` | Central tool registry and dispatcher |
| `src/services/agentManager.ts` | Loads agents from markdown, registers as tools |
| `src/services/mcpManager.ts` | MCP server connections and tool bridging |
| `src/services/sessionManager.ts` | Session persistence to `~/.omx/projects/` |
| `src/services/configManager.ts` | Model config, API keys, provider settings |
| `src/store/chatStore.ts` | Zustand store for chat state |
| `src/ui/components/ChatView.tsx` | Main terminal UI component |
| `src/prompts/systemPromptBuilder.ts` | Assembles full system prompt |
| `build.mjs` | esbuild configuration with obfuscation |
| `package.json` | Dependencies and scripts |

## Conventions

### Code Style

- **No comments or documentation in code** - per project guidelines
- Natural, casual English for all user-facing text
- ESM modules only (`"type": "module"`)
- TypeScript strict mode enabled
- Async/await for asynchronous operations
- Functional patterns over classes (except React components)

### File Naming

- TypeScript files: `camelCase.ts` or `camelCase.tsx`
- Markdown files: `kebab-case.md`
- Test files: `*.test.ts` (no test framework currently used)

### State Management

- Zustand stores in `src/store/`
- Minimal state - only session, messages, loading status
- Direct mutations via store actions

### Error Handling

- Errors displayed in UI via `error` state in chatStore
- Diagnostic mode saves full request/response JSON
- No telemetry or external error reporting

### Prompt Engineering

- Base system prompt in `src/prompts/system.txt`
- Specialized prompts for specialist mode, skills, compaction
- Dynamic prompt assembly via `systemPromptBuilder.ts`
- Platform-aware: includes `{{OS_TYPE}}`, `{{PLATFORM}}`, `{{ARCH}}`

### Tool Patterns

- Tools return structured results, not raw output
- Use specialized tools (read, glob, grep) over bash when possible
- Bash for actual system commands only
- Parallel execution when tools have no dependencies

### Extension Points

- **Agents**: Markdown with YAML frontmatter, loaded as `agent_*` tools
- **Slash Commands**: Markdown with Handlebars, triggered by `/`
- **MCP Servers**: JSON config, tools exposed as `mcp_*`
- **Skills**: Reusable prompt-based capabilities in `~/.omx/skills/`

### Build Process

- Development: `npm run dev` watches and rebuilds with source maps
- Production: `npm run build` bundles, minifies, and obfuscates
- Output: Single ESM bundle at `dist/cli.js`
- Includes: agents/, slash/, and bin/ directories copied to dist/
