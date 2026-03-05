# OmniContext CLI

**Precision context. Minimal cost.**

OmniContext CLI is a terminal-native coding assistant that treats context as a first-class resource. Lean system prompts keep overhead low. Specialist delegation routes grunt work to cheaper models while keeping your main context clean. Zero telemetry means your code never leaves your machine. And it extends into VS Code, Office, the browser, Figma, Obsidian, and Zed.

```bash
npm install -g omni-context-cli && omx
```

## How It Works

Traditional assistants call basic tools one at a time, resending your entire context with every round. OmniContext CLI delegates multi-step operations to agentic sub-agents running on a cheaper model -- your expensive model stays focused on reasoning, not file I/O.

**Task: "Find the definition of `handleAuth`"**

Traditional approach:

| Round | Call | Result |
|-------|------|--------|
| R1 | `glob("src/**/*.ts")` | 43 files returned |
| R2 | `grep("handleAuth", ...)` | 7 matches in 4 files |
| R3 | `read("src/middleware/auth.ts")` | 186 lines -- wrong file |
| R4 | `read("src/routes/login.ts")` | 124 lines -- still looking |
| R5 | `read("src/services/auth.ts", 40-90)` | Found it -- 50 more lines |

> 5 rounds, ~12K context added, all on main model

Specialist mode:

| Round | Call | Result |
|-------|------|--------|
| R1 | `pluck("handleAuth definition")` | Sub-agent (cheap model): glob -> grep -> read -> locate -> extract |

> 1 round, ~1K context added, grunt work on cheap model

## Agentic Tools

Each tool runs as an autonomous sub-agent on a cheaper model. It handles file I/O, error recovery, and retries internally -- keeping intermediate output out of your main context and your token bill down.

| Tool | Purpose |
|------|---------|
| **explore** | Survey project architecture -- directory layout, key files, and how the codebase is organized |
| **spark** | Run shell commands with automatic error detection and retry |
| **sculpt** | Edit files with surgical precision, find the right location, make the change, validate the result |
| **weave** | Write entire files from scratch with auto-validation |
| **sweep** | Find files matching complex criteria by name, content, or structure |
| **pluck** | Extract specific code segments -- functions, classes, or blocks you need |
| **ripple** | Trace symbol references across your codebase |
| **slice** | Answer targeted code questions by reading only the relevant parts |
| **quest** | Research topics via web search |
| **glance** | Preview multiple files at once with brief summaries |

## Workflow Presets

Switch how OmniContext CLI behaves with a single command. Each preset changes the tools available, the system prompt, and the response style.

| Preset | Description |
|--------|-------------|
| **Specialist** (default) | Your main model reasons, a cheaper agent model executes. Fewer rounds, cleaner context, lower cost. |
| **Explorer** | Research-first mode. Launches multiple web searches before answering. Great for current events, docs, and fact-checking. |
| **Artist** | Visual-first responses. Prioritizes image generation when the model supports it. Ideal for design exploration and mockups. |
| **Assistant** | Personal assistant for app integrations. Controls browser tabs, Office documents, and Figma designs through natural language. |
| **Normal** | Basic tools with manual orchestration. Direct read, write, edit, and bash access. Full control, no abstraction. |

## Native Multi-Protocol

Most tools funnel everything through a single API format and hope for the best. OmniContext CLI has a dedicated request builder and stream handler for each protocol. Prompt caching, extended thinking, and provider-specific features work exactly as the vendor intended -- no lossy translation layer in between.

| Protocol | Description |
|----------|-------------|
| **Anthropic** | Native Messages API with prompt caching, extended thinking, and streaming. Token-level cache control via custom TTL. |
| **OpenAI** | Native Chat Completions API. Compatible with any endpoint that speaks the OpenAI format. |
| **Gemini** | Native generateContent API with Gemini-specific streaming. Tools and function calling use Gemini's own schema. |
| **Responses API** | OpenAI's newer Responses API with built-in tool orchestration. Separate path from Chat Completions. |

## Cost Optimization

Every API call resends your full conversation history. Fewer rounds means fewer cache reads. Cleaner context means fewer tokens written. Specialist mode cuts both -- and offloads the grunt work to a cheaper model.

- **Fewer API rounds** -- Traditional tools need 5 rounds to find a function definition. Specialist mode does it in 1. That's 4 fewer full-context resends -- saving cache read costs on every skipped round.
- **Smaller context growth** -- Basic tools dump ~10KB of intermediate output into your conversation. Agentic tools return only the final result. Context editing automatically trims old tool payloads and thinking blocks, keeping growth in check even over long sessions.
- **Cheap model for execution** -- Sub-agents run on a low-cost model while your main model handles only planning and decisions. The expensive model never does file I/O.
- **1-hour cache for deep work** -- The default 5-minute prompt cache expires if you pause to think. Switch to 1-hour for debugging, refactoring, or research -- it eliminates repeated cache rebuilds across a session.

**Simulated cost comparison: "Find the definition of handleAuth"**

| | Traditional | Specialist | Saved |
|---|---|---|---|
| API rounds | 5 | 1 | -4 rounds |
| Cache read per round | ~20K tokens x 5 | ~20K tokens x 1 | -80K tokens |
| New context added | ~10KB | ~3KB | -70% |
| Cache write (new tokens) | ~2.5K tokens | ~1K tokens | -60% |
| Execution model | Expensive model only | Expensive + cheap | ~30% cheaper |

*Based on a 20K-token conversation finding a function across a TypeScript project. Actual savings depend on project size and model pricing.*

## Model Providers

One command to add all your models. OmniContext CLI ships with built-in provider presets -- pick one, paste your API key, and every model from that service is ready to use.

```bash
# List available providers
$ omx --list-providers

# Add all models from a provider in one go
$ omx --add-provider zenmux --api-key zmx-...

# Remove a provider just as easily
$ omx --remove-provider zenmux
```

Built-in providers: **Zenmux**, **DeepSeek**, **OpenRouter**, **Zhipu (GLM)**, **MiniMax**

## Cross-Session Memory

OmniContext CLI remembers your coding style, project patterns, and past decisions across sessions. Key points are extracted from every conversation and injected into future sessions. Helpful points gain score, harmful ones drop fast, unused ones decay naturally. Each project has its own memory file -- edit it directly if you want full control.

## Integrations

Terminal is home base, but OmniContext CLI reaches into every tool you use. One AI, consistent context, zero context switching.

- **VS Code Extension** -- full IDE integration with file context, diagnostics, and diff views
- **Desktop App** -- standalone GUI that acts as the local hub connecting Office, browser, and Figma extensions
- **Chrome Extension** -- sidebar on any webpage for summarization, data extraction, and browser automation
- **Office Add-in** -- AI panel inside Word, Excel, and PowerPoint
- **Figma Plugin** -- inspect layouts, create shapes, modify nodes, and export assets through chat
- **Zed Editor** -- external agent via Agent Client Protocol with full tool access
- **Web Client** -- browser UI with LaTeX, Mermaid diagrams, file attachments, and drag-and-drop
- **Mobile Access** -- run `omx --serve` and connect from your phone

## Extensibility

Custom agents, skills, slash commands, and MCP servers. Everything is a markdown file or JSON config.

- **Custom SubAgents** -- write a markdown file with a prompt template and tool permissions. It becomes a new agentic tool instantly. Add `OMX-AGENTS.md` for global agent instructions.
- **Custom Skills** -- teach OmniContext CLI domain-specific knowledge and workflows. Skills inject instructions into the current conversation.
- **Slash Commands** -- create shortcuts for common prompts with Handlebars templating.
- **MCP Servers** -- connect external tools and data sources via Model Context Protocol. Stdio and HTTP transports supported.

## The Details

- **Lean system prompts** -- minimal, focused instructions and concise tool descriptions. Your tokens go toward actual work, not bloated framework overhead.
- **Zero telemetry** -- no usage tracking, no analytics, no data collection.
- **Context editing** -- automatically trims old tool call payloads and thinking blocks from your conversation history.
- **Extended thinking** -- enable deeper reasoning for complex tasks with configurable budget limits.
- **CLAUDE.md compatible** -- already have a CLAUDE.md in your repo? OmniContext CLI reads it automatically.
- **Auto-compaction** -- when context hits 80% capacity, the conversation is compacted, key memories are extracted, and a fresh session picks up where you left off.
- **Native prompt caching** -- automatic cache control for Anthropic and Gemini with custom TTL settings.
- **Project instructions** -- drop an `OMX.md` in your repo root and everyone on the team gets the same conventions and context.

## Build & Release

```bash
npm run release
```

One command builds the CLI, all clients, packages release zips, and builds the desktop app for the current platform. Artifacts go to `release/`.

## Documentation

**https://bluenoah1991.github.io/omni-context-cli-landing/docs/**

## License

MIT
