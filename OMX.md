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

# Export project data
npm start -- --export-project backup.tar.gz

# Import project data
npm start -- --import-project backup.tar.gz

# Start web server mode
npm start -- --serve

# Start server and open web UI in browser
npm start -- --serve --web

# Override workflow preset
npm start -- --workflow artist

# Add models from a provider
npm start -- --add-provider openrouter --api-key <key>

# Remove all models from a provider
npm start -- --remove-provider openrouter

# List available model providers
npm start -- --list-providers

# Install VS Code extension
npm start -- --install-vscode-extension

# Require approval for write tools (Bash, Edit, Write)
npm start -- --approve-write

# Require approval for all tools
npm start -- --approve-all

# Enable HTTPS for server mode
npm start -- --serve --tls --tls-cert cert.pem --tls-key key.pem

# Run as ACP (Agent Client Protocol) agent over stdio
npm start -- --acp

# Save config changes to project scope
npm start -- --scope project

# Set UI language
npm start -- --lang zh-CN

# Set password for web UI authentication
npm start -- --set-password

# Remove password and disable web UI authentication
npm start -- --clear-password

# Install as a systemd user service (Linux only)
npm start -- --install-daemon

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
    |-- skillManager - Skill system management
    |-- remoteToolBridge - Remote tool execution for external clients
    |-- longPollTransport - Long-poll transport for remote clients
    |-- ideIntegration - IDE integration via MCP/WebSocket
    |-- gitService - Git operations (commit message generation)
    |-- costAnalysis - Token usage and cost tracking
    |-- projectExporter - Project data export/import
    |-- daemonInstaller - Systemd daemon installation (Linux)
    +-- acpAgent - ACP (Agent Client Protocol) agent over stdio
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
- Request interceptors modify requests for specific providers (Anthropic, Codex, Gemini, MiniMax, Xai, Zenmux, Zhipu)
- Media files (images, PDFs, documents) can be attached to user messages across all providers
- Tool approval system allows requiring user confirmation before tool execution
- ACP agent mode exposes OMX as an Agent Client Protocol agent over stdio

**Request Interceptors:**
Provider-specific interceptors modify API requests before sending:
- `AnthropicLegacyInterceptor` - Anthropic legacy model handling
- `AnthropicNextInterceptor` - Anthropic next-gen model adjustments (Opus 4.6, Sonnet 4.6)
- `CodexInterceptor` - Responses API adjustments
- `GeminiLegacyInterceptor` - Gemini legacy model compatibility
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
- **Protocols**: MCP (Model Context Protocol) via @modelcontextprotocol/sdk, ACP (Agent Client Protocol) via @agentclientprotocol/sdk
- **HTTP Client**: Undici (with connection pooling)
- **WebSocket**: ws (IDE integration)
- **CLI Framework**: Commander.js
- **Build Tool**: esbuild 0.27 (bundles to dist/cli.js)
- **Code Obfuscation**: javascript-obfuscator (production builds only)
- **Templating**: Handlebars (slash commands)
- **File Operations**: glob, gray-matter (frontmatter parsing), ignore (gitignore parsing)
- **Utilities**: figlet, marked (markdown), highlight.js (syntax highlighting), diff (unified diffs), turndown (HTML to markdown), node-notifier (desktop notifications)

## Development

### Project Structure

```
omx/
|-- src/
|   |-- cli.tsx                    # Entry point, CLI setup
|   |-- services/                  # Core business logic
|   |   |-- chatOrchestrator.ts    # Main conversation orchestration
|   |   |-- agentManager.ts        # Agent loading from markdown
|   |   |-- agentExecutor.ts       # Agent execution with parameters
|   |   |-- agentInstructionsManager.ts # Agent instructions loading
|   |   |-- toolExecutor.ts        # Tool registry and dispatcher
|   |   |-- toolApproval.ts        # Tool approval before execution
|   |   |-- mcpManager.ts          # MCP server lifecycle
|   |   |-- sessionManager.ts      # Session CRUD and persistence
|   |   |-- webSessionManager.ts   # Web session state and approval flow
|   |   |-- configManager.ts       # Model configuration and API keys
|   |   |-- slashManager.ts        # Slash command loading
|   |   |-- slashHandlers.ts       # Functional slash command handlers
|   |   |-- memoryManager.ts       # Cross-session memory system
|   |   |-- compactionManager.ts   # Context summarization
|   |   |-- skillManager.ts        # Skill system management
|   |   |-- messageConverter.ts    # Message format conversion between providers
|   |   |-- modelProvider.ts       # Model provider registry
|   |   |-- projectInstructionsManager.ts # Project instructions loading
|   |   |-- remoteToolBridge.ts    # Remote tool execution for external clients
|   |   |-- longPollTransport.ts   # Long-poll transport for remote clients
|   |   |-- ideIntegration.ts      # IDE integration via MCP/WebSocket
|   |   |-- gitService.ts          # Git operations (commit messages)
|   |   |-- gitignoreParser.ts     # Gitignore file parsing
|   |   |-- inputHistoryManager.ts # Input history persistence
|   |   |-- mediaBuffer.ts         # Media buffer for artifact saving
|   |   |-- taskManager.ts         # Background task management
|   |   |-- diagnostic.ts          # Diagnostic mode management
|   |   |-- costAnalysis.ts        # Token usage and cost tracking
|   |   |-- projectExporter.ts    # Project data export/import
|   |   |-- daemonInstaller.ts     # Systemd daemon installation (Linux)
|   |   |-- acpAgent.ts            # ACP agent over stdio
|   |   |-- baseStreamHandler.ts   # Base class for streaming response handlers
|   |   |-- requestInterceptor.ts  # Applies provider-specific request modifications
|   |   |-- anthropic/openai/gemini/responsesRequestBuilder.ts # API request formatting
|   |   |-- anthropic/openai/gemini/responsesStreamHandler.ts  # Streaming response handling
|   |   |-- modelProviders/        # Model source adapters (DeepSeek, MiniMax, etc.)
|   |   |-- interceptors/          # Provider-specific interceptors
|   |   |-- tools/                 # Built-in tool implementations
|   |   +-- webServer/             # HTTP API, auth, and static server
|   |-- types/                     # TypeScript definitions (16 type files)
|   |-- prompts/                   # System prompt templates (21 files)
|   |-- store/                     # Zustand state management
|   |-- ui/
|   |   |-- components/            # React/Ink terminal UI components (24 components)
|   |   +-- markdown/              # Markdown rendering and syntax highlighting
|   +-- utils/                     # Helper utilities (7 files)
|-- clients/
|   |-- desktop/                   # Electron desktop client
|   |   |-- src/main/              # Main process (window, server, config, paths, IPC, shell env, Office Add-in, MCP registry)
|   |   |-- src/preload/           # Preload scripts
|   |   |-- src/portal/            # Configuration portal UI (React)
|   |   |   |-- components/        # Portal UI components (Select, ProviderItem)
|   |   |   |-- store/             # Portal state management
|   |   |   |-- providers/         # Provider configuration registry
|   |   |   |-- i18n/              # Portal internationalization (en-US, zh-CN)
|   |   |   +-- types/             # Portal type definitions
|   |   +-- cli-deps/              # CLI dependencies for bundling
|   |-- vscode/                    # VS Code extension
|   |   |-- src/extension.ts       # Extension entry point
|   |   |-- src/webviewProvider.ts # Webview panel management
|   |   |-- src/utils.ts           # Extension utilities
|   |   |-- src/providers/         # Content providers (diff)
|   |   +-- src/mcp/               # MCP server (transport, tools, selection, lock file)
|   |-- web/                       # Web client (React SPA)
|   |   |-- src/components/        # UI components (31 components)
|   |   |-- src/services/          # API service layer (auth, chat, config, session, files, memory)
|   |   |-- src/store/             # Zustand state management
|   |   |   +-- slices/            # Store slices (chat, config, session, ui)
|   |   |-- src/types/             # TypeScript type definitions
|   |   |-- src/i18n/              # Internationalization (en-US, zh-CN)
|   |   +-- src/utils/             # Client utilities (web session, file icons, preprocessing, tool approval)
|   |-- browser/                   # Browser extension (Chrome)
|   |   |-- src/background/        # Service worker and tool handlers
|   |   |   +-- tools/             # Individual tool implementations
|   |   |-- src/sidepanel/         # Side panel UI
|   |   |-- src/content/           # Content scripts
|   |   +-- src/types/             # Tool type definitions
|   |-- office/                    # Office Add-in
|   |   |-- src/taskpane/          # Taskpane UI
|   |   |-- src/tools/             # Word, Excel, PowerPoint tools
|   |   |-- src/services/          # Long-poll client and config
|   |   +-- src/types/             # Tool type definitions
|   |-- figma/                     # Figma plugin
|   |   |-- src/ui/                # Plugin UI
|   |   |   |-- tools/             # Figma tool implementations
|   |   |   |-- services/          # Long-poll client, sandbox bridge, config
|   |   |   +-- types/             # Tool type definitions
|   |   +-- src/sandbox/           # Figma sandbox code
|   +-- obsidian/                  # Obsidian plugin
|       |-- src/main.ts            # Plugin entry point, server lifecycle
|       |-- src/view.ts            # Sidebar UI view (ItemView)
|       |-- src/shellEnv.ts        # Shell environment resolution (Unix)
|       +-- src/mcp/               # MCP server (transport, tools, selection, lock file)
|-- agents/                        # Built-in agent definitions (.md)
|-- slash/                         # Built-in slash commands (.md)
|-- assets/                        # Icons and images
|-- bin/                           # Embedded ripgrep binaries
|-- scripts/                       # Build and setup scripts
|-- .omx/                          # Project-level config and customizations
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
| Custom Prompts | `~/.omx/*.txt` | - |
| Memory | - | `.omx/memory.json` |
| Project Instructions | - | `OMX.md` or `CLAUDE.md` (project root) |
| Agent Instructions | - | `OMX-AGENTS.md` (project root) or `.omx/OMX-AGENTS.md` |
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
| `workflowPreset` | 'normal' \| 'specialist' \| 'artist' \| 'explorer' \| 'assistant' | 'specialist' | Workflow mode: normal (basic), specialist (agent mode), artist (image-first responses), explorer (web search-focused), or assistant |
| `ideContext` | boolean | true | Include IDE context |
| `memoryEnabled` | boolean | true | Enable memory features |
| `notificationEnabled` | boolean | false | Enable desktop notifications |
| `cacheTtl` | '5m' \| '1h' | '5m' | Response cache duration |
| `serverCompaction` | boolean | false | Enable server-side context compaction |
| `contextEditing` | boolean | true | Enable context editing |
| `contextEditingRounds` | number | 0 | Number of context editing rounds |
| `responseLanguage` | 'auto' \| 'en' \| 'zh' | undefined | Override response language |
| `language` | string | undefined | UI language code (e.g. en-US, zh-CN) |
| `webTheme` | 'dark' \| 'light' \| 'auto' | 'auto' | Web client theme |
| `proxy` | string | undefined | HTTP proxy URL |

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
npm start -- --serve --host 0.0.0.0
```

The web server provides:
- REST API for chat, sessions, and configuration
- Static file serving for web UI
- Server-sent events for streaming responses

Web server components in `src/services/webServer/`:
- `index.ts` - Server setup and routing
- `auth.ts` - Bearer token authentication and rate limiting
- `staticServer.ts` - Static file serving
- `httpUtils.ts` - HTTP utilities
- `apiHandlers.ts` - API route handlers
- `handlers/` - Route-specific handlers (chat, sessions, config, files, remote tools, memory)

### Desktop Client

The Electron desktop client (`clients/desktop/`) provides a standalone application:

- Spawns OMX server with dynamic port allocation
- Configuration portal with tabs: workspaces, models, MCP servers, skills, settings, system prompts, office/browser/obsidian/figma integration, mobile access
- Custom system prompts for specialist, artist, explorer, and assistant modes
- MCP server management with MCP Registry marketplace integration
- Skill management (listing, deletion, install guidance)
- Workspace management with multi-workspace support
- Auto-opens default workspace (Documents/OmniContext)
- Shell environment resolution on macOS (inherits login shell PATH)
- Bundles CLI dependencies for offline use
- Built-in Office Add-in server for local Office integration
- LAN access and fixed port options for mobile clients
- Internationalization support (English, Chinese)
- macOS and Windows support

Build the desktop client:
```bash
cd clients/desktop
npm install
npm run build
npm run package        # Create distributable
npm run package:win    # Windows installer
npm run package:mac    # macOS app bundle
```

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
- File tree browser with file preview panel
- Diff view for file changes
- Mermaid diagram rendering
- LaTeX/KaTeX math rendering
- Collapsible content blocks
- Memory key points viewer
- Cache TTL countdown timer
- Bearer token authentication with login page
- Mobile-optimized with PWA support
- Touch-friendly UI with safe area handling
- Text-to-speech for message content
- Internationalization support (English, Chinese)

Build the web client:
```bash
cd clients/web
npm install
npm run build
```

For VS Code extension embedding, use `npm run build:vscode`. For desktop client embedding, use `npm run build:desktop`.

### Browser Extension

The browser extension (`clients/browser/`) adds a Chrome side panel for interacting with OMX:

- Side panel UI connecting to OMX server via long-poll
- Background service worker with tool handlers (tabs, screenshots, page content, bookmarks, history, CDP, executeScript, wait)
- Content scripts for page text extraction (readability)

Build the extension:
```bash
cd clients/browser
npm install
npm run build
```

### Office Add-in

The Office Add-in (`clients/office/`) integrates OMX into Microsoft Office apps:

- Taskpane UI connecting to OMX server via long-poll
- Tools for Word, Excel, and PowerPoint manipulation
- Manifest template with build-time base URL injection

Build the add-in:
```bash
cd clients/office
npm install
npm run build
```

### Figma Plugin

The Figma plugin (`clients/figma/`) integrates OMX into Figma:

- Plugin UI connecting to OMX server via long-poll
- Sandbox bridge for Figma API access
- Tool execution within Figma context

Build the plugin:
```bash
cd clients/figma
npm install
npm run build
```

### Obsidian Plugin

The Obsidian plugin (`clients/obsidian/`) integrates OMX as a sidebar view:

- Sidebar iframe view connecting to spawned OMX server
- MCP server exposing Obsidian vault tools (openNote, readNote, createNote, modifyNote, searchNotes, getBacklinks, getAllTags, etc.)
- WebSocket transport for MCP communication
- Lock file-based discovery for CLI-IDE communication
- Selection broadcasting to MCP clients
- Shell environment resolution on macOS/Linux

Build the plugin:
```bash
cd clients/obsidian
npm install
npm run build
```

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
| `src/services/remoteToolBridge.ts` | Remote tool execution bridge for external clients |
| `src/services/longPollTransport.ts` | Long-poll transport for remote clients |
| `src/services/ideIntegration.ts` | IDE integration via MCP/WebSocket |
| `src/services/gitService.ts` | Git operations and commit message generation |
| `src/services/projectInstructionsManager.ts` | Project instructions (OMX.md/CLAUDE.md) loading |
| `src/services/agentInstructionsManager.ts` | Agent instructions (OMX-AGENTS.md) loading |
| `src/services/inputHistoryManager.ts` | Input history persistence |
| `src/services/costAnalysis.ts` | Token usage and cost tracking |
| `src/services/diagnostic.ts` | Diagnostic mode management |
| `src/services/acpAgent.ts` | ACP agent over stdio |
| `src/services/daemonInstaller.ts` | Systemd daemon installation (Linux) |
| `src/services/projectExporter.ts` | Project data export/import |
| `src/services/modelProvider.ts` | Model provider registry |
| `src/services/modelProviders/` | Model source adapters (map to API types) |
| `src/services/interceptors/` | Provider-specific interceptors (Anthropic, Codex, Gemini, MiniMax, Xai, Zenmux, Zhipu) |
| `src/services/webServer/` | HTTP API, auth, and static server components |
| `src/services/webServer/auth.ts` | Bearer token authentication and rate limiting |
| `src/services/webServer/handlers/fileHandlers.ts` | File browsing API handlers |
| `src/services/webServer/handlers/memoryHandlers.ts` | Memory key points API handlers |
| `clients/desktop/src/main/index.ts` | Electron main process entry point |
| `clients/desktop/src/main/window.ts` | Window creation and management |
| `clients/desktop/src/main/server.ts` | CLI server spawning and lifecycle |
| `clients/desktop/src/main/config.ts` | Desktop configuration management |
| `clients/desktop/src/main/paths.ts` | Path utilities for desktop app |
| `clients/desktop/src/main/ipc.ts` | IPC handlers between main and renderer |
| `clients/desktop/src/main/mcpRegistry.ts` | MCP Registry marketplace API client |
| `clients/desktop/src/main/officeAddin.ts` | Built-in Office Add-in server |
| `clients/desktop/src/main/shellEnv.ts` | Shell environment resolution (macOS) |
| `clients/desktop/src/portal/App.tsx` | Configuration portal (workspaces, models, MCP, skills, settings, prompts, integrations) |
| `clients/desktop/src/portal/store/portalStore.ts` | Portal state management |
| `clients/desktop/src/portal/providers/` | Provider configuration registry |
| `clients/desktop/src/portal/i18n/` | Portal internationalization (en-US, zh-CN) |
| `clients/vscode/src/extension.ts` | VS Code extension entry point |
| `clients/vscode/src/webviewProvider.ts` | Webview panel management |
| `clients/vscode/src/utils.ts` | Extension utilities |
| `clients/vscode/src/providers/diffProvider.ts` | Diff content provider |
| `clients/vscode/src/mcp/server.ts` | MCP server for IDE integration |
| `clients/vscode/src/mcp/transport.ts` | MCP transport layer |
| `clients/vscode/src/mcp/tools.ts` | MCP tool definitions |
| `clients/vscode/src/mcp/selection.ts` | Editor selection handling |
| `clients/vscode/src/mcp/lockFile.ts` | Lock file-based CLI discovery |
| `clients/web/src/App.tsx` | Web client main component |
| `clients/web/src/store/chatStore.ts` | Web client state management |
| `clients/web/src/store/slices/` | Store slices (chat, config, session, ui) |
| `clients/web/src/i18n/` | Web client internationalization (en-US, zh-CN) |
| `clients/web/src/services/apiFetch.ts` | Auth fetch wrapper with Bearer token injection |
| `clients/web/src/services/authService.ts` | Authentication API service |
| `clients/web/src/services/chatService.ts` | Chat message handling |
| `clients/web/src/services/sessionService.ts` | Session management |
| `clients/web/src/services/configService.ts` | Configuration API |
| `clients/web/src/services/fileService.ts` | File browsing API service |
| `clients/web/src/services/memoryService.ts` | Memory key points API service |
| `clients/web/src/components/AuthGate.tsx` | Auth state gate wrapper |
| `clients/web/src/components/LoginPage.tsx` | Login page with lockout |
| `clients/web/src/components/FileTree.tsx` | File tree browser component |
| `clients/web/src/components/PreviewPanel.tsx` | File preview panel |
| `clients/web/src/components/DiffView.tsx` | Diff view for file changes |
| `clients/web/src/components/CacheCountdown.tsx` | Cache TTL countdown timer |
| `clients/web/src/components/MemoryPanel.tsx` | Memory key points panel |
| `clients/browser/src/background/index.ts` | Browser extension service worker |
| `clients/browser/src/background/toolManager.ts` | Browser tool registration and dispatch |
| `clients/browser/src/sidepanel/App.tsx` | Side panel UI |
| `clients/office/src/taskpane/App.tsx` | Office Add-in taskpane UI |
| `clients/figma/src/ui/App.tsx` | Figma plugin UI |
| `clients/obsidian/src/main.ts` | Obsidian plugin entry point |
| `clients/obsidian/src/view.ts` | Obsidian sidebar view |
| `clients/obsidian/src/mcp/server.ts` | MCP server for Obsidian integration |
| `clients/obsidian/src/mcp/transport.ts` | MCP transport layer |
| `clients/obsidian/src/mcp/tools.ts` | MCP tool definitions (Obsidian API) |
| `clients/obsidian/src/mcp/selection.ts` | Selection broadcasting to MCP clients |
| `clients/obsidian/src/mcp/lockFile.ts` | Lock file-based CLI discovery |
| `src/ui/markdown/index.tsx` | Markdown rendering for terminal |
| `src/ui/markdown/highlight-code.tsx` | Syntax highlighting for code blocks |
| `src/utils/contextEditor.ts` | Context editing utilities for configurable context rounds |
| `src/utils/frontmatter.ts` | YAML frontmatter parsing |
| `src/utils/mediaUtils.ts` | Media file handling and encoding |
| `src/utils/messagePreprocessor.ts` | Message preprocessing for display and API calls |
| `src/utils/messageUtils.ts` | Message utility functions |
| `src/utils/omxPaths.ts` | Path utilities for OMX directories |
| `src/utils/wsl.ts` | WSL detection and utilities |
| `src/store/chatStore.ts` | Zustand store for chat state |
| `src/store/ideStore.ts` | Zustand store for IDE integration state |
| `src/ui/components/ChatView.tsx` | Main terminal UI component |
| `src/ui/components/MediaContextBar.tsx` | Media attachment preview bar |
| `src/ui/components/OptionPicker.tsx` | Option selection UI |
| `src/prompts/systemPromptBuilder.ts` | Assembles full system prompt |
| `scripts/fix-bin-permissions.js` | Postinstall script to fix ripgrep binary permissions |
| `scripts/bump-version.mjs` | Version bumping script |
| `scripts/release-build.mjs` | Release build automation |
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
- Specialized prompts for specialist, artist, explorer, and assistant modes
- Additional prompts for skills, compaction, memory, agent instructions, project instructions, WSL hints, reflection, commit messages, summary injection, welcome/onboarding
- Dynamic prompt assembly via `systemPromptBuilder.ts` and dedicated prompt builders
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
| `Read` | Read file contents with line numbers, images, and PDFs |
| `SaveArtifact` | Save the most recently generated artifact to a file |
| `Skill` | Load a skill from available skills to get detailed instructions |
| `WebFetch` | Fetch URL content and convert HTML to readable markdown |
| `WebSearch` | Perform web searches via Anthropic API |
| `Write` | Create or overwrite files (supports base64 encoding for binary files) |

### Build Process

- Development: `npm run dev` watches and rebuilds with source maps
- Production: `npm run build` bundles, minifies, and obfuscates
- Output: Single ESM bundle at `dist/cli.js`
- Includes: agents/, slash/, assets/, and bin/ directories copied to dist/
- Desktop client: Built separately via `npm run build` in `clients/desktop/`
- Web client: Built separately via `npm run build` in `clients/web/`
- VS Code extension: Built separately via `npm run build` in `clients/vscode/`
- Browser extension: Built separately via `npm run build` in `clients/browser/`
- Office Add-in: Built separately via `npm run build` in `clients/office/`
- Figma plugin: Built separately via `npm run build` in `clients/figma/`
- Obsidian plugin: Built separately via `npm run build` in `clients/obsidian/`
