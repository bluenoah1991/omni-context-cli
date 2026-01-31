- All English copy in the project should be natural, casual, and idiomatic to native English speakers.
- Do not add any code comments or documentation.

# OMX (Omni Context CLI)

A zero-telemetry CLI coding assistant built with React/Ink, supporting multiple LLM API types (Anthropic, OpenAI, Gemini, Responses) and model sources (DeepSeek, MiniMax, OpenRouter, Zenmux, Zhipu), extensible via agents, slash commands, and MCP servers.

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

# Start web server mode
npm start -- --serve

# Require approval for write tools (Bash, Edit, Write)
npm start -- --approve-write

# Require approval for all tools
npm start -- --approve-all

# Format code
npm run format
```

## Architecture

OMX follows a layered architecture:

```
CLI Entry (cli.tsx)
    |
UI Layer (Ink/React) - ChatView, InputBox, Menu, MediaContextBar, OptionPicker
    |
Service Layer
    |-- chatOrchestrator - Main conversation loop
    |-- agentManager - Loads agents from markdown
    |-- agentExecutor - Executes agents with parameters
    |-- toolExecutor - Dispatches tool calls
    |-- mcpManager - MCP server integration
    |-- sessionManager - Session persistence
    |-- memoryManager - Cross-session memory and key points
    |-- compactionManager - Auto-summarization at context limits
    +-- skillManager - Skill system management
    |
Provider Adapters
    |-- anthropic/openai/gemini/responsesRequestBuilder - Format API requests
    |-- anthropic/openai/gemini/responsesStreamHandler - Handle streaming responses
    |-- requestInterceptor - Apply provider-specific interceptors
    +-- modelProviders/ - Model source adapters (DeepSeek, MiniMax, OpenRouter, Zenmux, Zhipu)
    |
Storage/State
    |-- chatStore - Zustand state management
    +-- File system - Sessions in ~/.omx/projects/
```

**Key Flows:**
- User input -> parse slash commands -> build request -> stream response -> execute tools -> update UI
- Tool execution runs in parallel when possible
- Agents are invoked as tools with custom prompts
- MCP servers expose tools prefixed with `mcp_`
- Request interceptors modify requests for specific providers (Codex, MiniMax, Xai, Zenmux, Zhipu)
- Media files (images, PDFs, documents) can be attached to user messages across all providers
- Tool approval system allows requiring user confirmation before tool execution

**Request Interceptors:**
Provider-specific interceptors modify API requests before sending:
- `CodexInterceptor` - Responses API adjustments
- `MiniMaxInterceptor` - MiniMax API compatibility
- `XaiInterceptor` - xAI API compatibility
- `ZenmuxInterceptor` - Zenmux proxy handling
- `ZhipuInterceptor` - Zhipu AI compatibility

**Proxy Support:**
- HTTP proxy via `HTTP_PROXY` and `HTTPS_PROXY` environment variables
- Uses `EnvHttpProxyAgent` for automatic proxy configuration

## Tech Stack

- **Runtime**: Node.js 18+ (ESM modules)
- **Language**: TypeScript 5.9 (ES2022 target, strict mode)
- **UI Framework**: Ink 6.5 + React 19 (terminal UI)
- **State Management**: Zustand 5
- **LLM API Types**: Anthropic, OpenAI, Gemini, Responses
- **Model Sources**: DeepSeek, MiniMax, OpenRouter, Zenmux, Zhipu (via pluggable model providers)
- **Protocol**: MCP (Model Context Protocol) via @modelcontextprotocol/sdk
- **HTTP Client**: Undici (with connection pooling)
- **Build Tool**: esbuild 0.27 (bundles to dist/cli.js)
- **Code Obfuscation**: javascript-obfuscator (production builds only)
- **Templating**: Handlebars (slash commands)
- **File Operations**: glob, gray-matter (frontmatter parsing)
- **Utilities**: figlet, marked (markdown), highlight.js (syntax highlighting), diff (unified diffs)

## Development

### Project Structure

```
omx/
|-- src/
|   |-- cli.tsx                    # Entry point, CLI setup
|   |-- services/                  # Core business logic (35 services)
|   |   |-- chatOrchestrator.ts    # Main conversation orchestration
|   |   |-- agentManager.ts        # Agent loading from markdown
|   |   |-- agentExecutor.ts       # Agent execution with parameters
|   |   |-- toolExecutor.ts        # Tool registry and dispatcher
|   |   |-- toolApproval.ts        # Tool approval before execution
|   |   |-- mcpManager.ts          # MCP server lifecycle
|   |   |-- sessionManager.ts      # Session CRUD and persistence
|   |   |-- webSessionManager.ts   # Web session state and approval flow
|   |   |-- configManager.ts       # Model configuration and API keys
|   |   |-- slashManager.ts        # Slash command loading
|   |   |-- memoryManager.ts       # Cross-session memory system
|   |   |-- compactionManager.ts   # Context summarization
|   |   |-- skillManager.ts        # Skill system management
|   |   |-- messageConverter.ts    # Message format conversion between providers
|   |   |-- modelProviders/        # Model source adapters (DeepSeek, MiniMax, etc.)
|   |   |-- interceptors/          # Provider-specific interceptors
|   |   |-- tools/                 # Built-in tool implementations
|   |   +-- webServer/             # HTTP API and static server
|   |-- types/                     # TypeScript definitions (16 type files)
|   |-- prompts/                   # System prompt templates (16 files)
|   |-- store/                     # Zustand state management
|   |-- ui/                        # React/Ink components (23 components)
|   +-- utils/                     # Helper utilities (7 files)
|-- clients/
|   |-- vscode/                    # VS Code extension
|   |   |-- src/extension.ts       # Extension entry point
|   |   |-- src/webviewProvider.ts # Webview panel management
|   |   +-- src/mcp/               # MCP server for IDE integration
|   +-- web/                       # Web client (React SPA)
|       |-- src/components/        # UI components
|       |-- src/services/          # API service layer
|       +-- src/store/             # Zustand state management
|-- agents/                        # Built-in agent definitions (.md)
|-- slash/                         # Built-in slash commands (.md)
|-- assets/                        # Icons and images
|-- bin/                           # Embedded ripgrep binaries
|-- .omx/                          # User-level config and customizations
|-- package.json
|-- tsconfig.json
+-- build.mjs                      # Build script with esbuild
```

### Adding Tools

Tools are registered in `src/services/tools/index.ts`. Each tool:
1. Calls `registerTool()` with a `ToolDefinition` and `ToolHandler`
2. Implements async execution logic
3. Returns formatted results

Example from `grep.ts`:
```typescript
registerTool({
  name: 'Grep',
  description: 'Search file contents using ripgrep',
  parameters: { /* JSON Schema */ },
  formatCall: (params) => `Search: ${params.pattern}`
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
| Memory | - | `.omx/memory.json` |
| Agent Instructions | - | `.omx/OMX-AGENTS.md` |
| Sessions | `~/.omx/projects/<id>/` | - |

**Priority**: Project-level overrides user-level overrides built-in.

### Configuration Options

Key options in `~/.omx/omx.json` or `.omx/omx.json`:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `models` | ModelConfig[] | [] | Configured models with API keys |
| `defaultModelId` | string | undefined | Default model to use |
| `agentModelId` | string | undefined | Model for agent execution |
| `enableThinking` | boolean | true | Enable Claude thinking mode |
| `streamingOutput` | boolean | false | Stream responses to terminal |
| `specialistMode` | boolean | true | Enable specialist agent mode |
| `ideContext` | boolean | true | Include IDE context |
| `memoryEnabled` | boolean | false | Enable memory features |
| `cacheTtl` | '5m' \| '1h' | '5m' | Response cache duration |
| `contextEditing` | boolean | true | Enable context editing |
| `contextEditingRounds` | number | 0 | Number of context editing rounds |

### Tool Approval

Tool approval requires user confirmation before executing potentially destructive tools:

| Flag | Scope | Description |
|------|-------|-------------|
| `--approve-write` | Write tools | Requires approval for Bash, Edit, Write |
| `--approve-all` | All tools | Requires approval for all base tools |

Agent tools (`agent_*`) and MCP tools (`mcp_*`) don't require direct approval - approval happens at the base tool level where actual changes occur.

### MCP Integration

MCP servers are configured in `~/.omx/mcp.json` or `.omx/mcp.json`. The `mcpManager` connects to servers via stdio or HTTP and exposes their tools as `mcp_<server>_<tool>`.

### Web Server Mode

Start OMX as an HTTP server with `--serve` flag (default port 5281):

```bash
npm start -- --serve
npm start -- --serve --port 8080
```

The web server provides:
- REST API for chat, sessions, and configuration
- Static file serving for web UI
- Server-sent events for streaming responses

Web server components in `src/services/webServer/`:
- `index.ts` - Server setup and routing
- `staticServer.ts` - Static file serving
- `httpUtils.ts` - HTTP utilities
- `apiHandlers.ts` - API route handlers
- `handlers/` - Route-specific handlers (chat, sessions, config)

### VS Code Extension

The VS Code extension (`clients/vscode/`) provides an integrated coding assistant within the IDE:

- Activity bar panel with webview UI
- MCP server for IDE integration (diagnostics, file operations, diff views)
- Remote development support with external URIs
- Lock file-based discovery for CLI-IDE communication

Build the extension:
```bash
cd clients/vscode
npm install
npm run build
```

### Web Client

The web client (`clients/web/`) is a React SPA that connects to the OMX server:

- Full chat interface with message history
- Session management and rewind
- Settings panel for model configuration
- Tool approval UI for confirming operations
- Drag and drop file attachment
- Document (PDF) and image support

Build the web client:
```bash
cd clients/web
npm install
npm run build
```

For VS Code extension embedding, use `npm run build:vscode`.

## Key Files

| File | Purpose |
|------|---------|
| `src/cli.tsx` | Entry point, initializes services and renders UI |
| `src/services/chatOrchestrator.ts` | Main conversation loop, request/response flow |
| `src/services/toolExecutor.ts` | Central tool registry and dispatcher |
| `src/services/agentManager.ts` | Loads agents from markdown, registers as tools |
| `src/services/agentExecutor.ts` | Executes agents with parameters and allowed tools |
| `src/services/mcpManager.ts` | MCP server connections and tool bridging |
| `src/services/sessionManager.ts` | Session persistence to `~/.omx/projects/` |
| `src/services/configManager.ts` | Model config, API keys, provider settings |
| `src/services/requestInterceptor.ts` | Applies provider-specific request modifications |
| `src/services/messageConverter.ts` | Message format conversion between providers |
| `src/services/baseStreamHandler.ts` | Base class for streaming response handlers |
| `src/services/anthropicRequestBuilder.ts` | Anthropic API request formatting |
| `src/services/anthropicStreamHandler.ts` | Anthropic streaming response handling |
| `src/services/openaiRequestBuilder.ts` | OpenAI API request formatting |
| `src/services/openaiStreamHandler.ts` | OpenAI streaming response handling |
| `src/services/geminiRequestBuilder.ts` | Google Gemini API request formatting |
| `src/services/geminiStreamHandler.ts` | Google Gemini streaming response handling |
| `src/services/responsesRequestBuilder.ts` | Responses API request formatting |
| `src/services/responsesStreamHandler.ts` | Responses API streaming handling |
| `src/services/memoryManager.ts` | Cross-session memory and key points |
| `src/services/compactionManager.ts` | Auto-summarization at context limits |
| `src/services/skillManager.ts` | Skill discovery and loading |
| `src/services/toolApproval.ts` | Tool approval mode and formatting |
| `src/services/webSessionManager.ts` | Web session state and approval flow |
| `src/services/modelProviders/` | Model source adapters (map to API types) |
| `src/services/interceptors/` | Provider-specific interceptors (Codex, MiniMax, Xai, Zenmux, Zhipu) |
| `src/services/webServer/` | HTTP API and static server components |
| `clients/vscode/src/extension.ts` | VS Code extension entry point |
| `clients/vscode/src/mcp/server.ts` | MCP server for IDE integration |
| `clients/web/src/App.tsx` | Web client main component |
| `clients/web/src/store/chatStore.ts` | Web client state management |
| `src/utils/contextEditor.ts` | Context editing utilities for configurable context rounds |
| `src/utils/mediaUtils.ts` | Media file handling and encoding |
| `src/utils/messagePreprocessor.ts` | Message preprocessing for display and API calls |
| `src/utils/omxPaths.ts` | Path utilities for OMX directories |
| `src/store/chatStore.ts` | Zustand store for chat state |
| `src/store/ideStore.ts` | Zustand store for IDE integration state |
| `src/ui/components/ChatView.tsx` | Main terminal UI component |
| `src/ui/components/MediaContextBar.tsx` | Media attachment preview bar |
| `src/ui/components/OptionPicker.tsx` | Option selection UI |
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
- Specialized prompts for specialist mode, skills, compaction, memory, agent instructions
- Dynamic prompt assembly via `systemPromptBuilder.ts`
- Platform-aware: includes `{{OS_TYPE}}`, `{{PLATFORM}}`, `{{ARCH}}`, `{{CWD}}`
- Context editing via `contextEditor.ts` for configurable message modification rounds

### Tool Patterns

- Tools return structured results, not raw output
- Use specialized tools (Read, Glob, Grep) over Bash when possible
- Bash for actual system commands only
- Parallel execution when tools have no dependencies
- Tool results include `diffs` field for file changes (when success is true)

### Extension Points

- **Agents**: Markdown with YAML frontmatter, loaded as `agent_*` tools
- **Slash Commands**: Markdown with Handlebars, triggered by `/`
- **MCP Servers**: JSON config, tools exposed as `mcp_*`
- **Skills**: Reusable prompt-based capabilities in `~/.omx/skills/`

### Built-in Agents

| Agent | Purpose |
|-------|---------|
| `explore` | Survey project structure and architecture |
| `glance` | Preview multiple files with brief summaries |
| `pluck` | Extract specific code segments from a file |
| `quest` | Research topics using web search |
| `ripple` | Find all references to a symbol |
| `sculpt` | Edit files by replacing text with auto-retry |
| `slice` | Extract code snippets relevant to a question |
| `spark` | Execute bash commands with auto-fix |
| `sweep` | Find files matching search criteria |
| `weave` | Write content to files |

### Built-in Tools

| Tool | Purpose |
|------|---------|
| `Bash` | Run shell commands with timeout and background support |
| `BashOutput` | Check background task status |
| `Edit` | Surgical text replacements in files |
| `Glob` | Find files by pattern |
| `Grep` | Search file contents using ripgrep |
| `Read` | Read file contents with line numbers |
| `WebSearch` | Perform web searches via Anthropic API |
| `Write` | Create or overwrite files |

### Build Process

- Development: `npm run dev` watches and rebuilds with source maps
- Production: `npm run build` bundles, minifies, and obfuscates
- Output: Single ESM bundle at `dist/cli.js`
- Includes: agents/, slash/, assets/, and bin/ directories copied to dist/
- Web client: Built separately via `npm run build` in `clients/web/`
- VS Code extension: Built separately via `npm run build` in `clients/vscode/`
