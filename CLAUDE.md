# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

Claudinator is a CLI tool inspired by Terminator that enables users to:

- Launch multiple Claude Code agent sessions on distinct GitHub Codespaces
- Work across agents simultaneously
- Seamlessly switch local environments between cloud agent environments

## Core Principles

Always follow SOLID principles. Always apply DDD patterns. Always write DRY
code. Split code across multiple files to keep things organized and clean up
unnecessary or old code when possible.

### Directory Structure

```
/src/<domain>/<type>/<file>.ts   (co-located tests: <file>.test.ts)
```

Domains: `agent`, `app`, `cli`, `git`, `github`, `logger`, `ssh`, `tty`, `ui`,
`utils`

Types within each domain: `models`, `service`, `repo`, `utils`, `config`,
`errors`, `components`, `pages`, `hooks`

## Technology Stack

- **Runtime**: Deno (TypeScript)
- **UI Framework**: React with Ink (terminal UI)
- **Testing**: Deno's built-in test runner with `@std/assert`
- **GitHub API**: Octokit
- **Architecture**: Domain-Driven Design with Repository + Service Factory
  patterns

## Essential Commands

### Development

- **Run in dev mode**: `deno task dev` (includes file watching)
- **Build executable**: `deno task build` or `deno task compile`
- **Install globally**: `deno task install`

### Testing

- **Run all tests**: `deno task test`
- **Test specific file**: `deno task test <file_path>`

### Linting & Type Checking

- **Type check**: `deno check src/**/*.ts src/**/*.tsx`
- **Format**: `deno fmt`
- **Lint**: `deno lint`

## Application Bootstrap Flow

```
main.ts
  → CliRunnerService.run(args)
    → SignalHandler setup (SIGINT/SIGTERM, double Ctrl+C = immediate exit)
    → Arg parsing (help, version)
    → AppService.run()
      → InkService.start(AppContainer)
        → 1s splash screen → MainApplicationPage
          → Creates SSH services (connection, terminal, session repo, TTY)
          → Renders AgentList (sidebar) + TileContainer (grid) + HelpBar
```

## Architecture Overview

### Domain Interactions

```
CLI (args) → App Service → Ink Service → UI Components
                                           ↕
                                     UIStateService (focus, selection, display mode)
                                           ↕
                                     AgentService (lifecycle, codespace management)
                                       ↕            ↕
                               GitHubCodespaceService  GitService
                                       ↕
                               SSHConnectionService (Deno child processes)
                                       ↕
                               TerminalService (output pump, state)
                                       ↕
                                   TTYService (ANSI parser, buffer management)
```

### Service Factory Pattern

All services expose factory functions, never direct class instantiation:

```typescript
export function createXxxService(...deps): XxxService {
  return new XxxServiceImpl(...deps);
}
```

Composite factories exist for related services (e.g., `createSSHServices()`
returns connection, terminal, session repo, and TTY services together).

### Dependency Injection Chain

```
CliRunnerService
  ├─ SignalHandlerService
  └─ AppService
      ├─ InkService(signalHandler)
      ├─ AgentRepository (in-memory Map, returns defensive copies)
      ├─ AgentService(agentRepo, gitHubCodespaceService, gitService)
      │  ├─ GitHubCodespaceService(codespaceRepo, authService)
      │  │  ├─ GitHubAuthService (gh CLI token)
      │  │  └─ OctokitClient
      │  └─ GitService(gitCommandExecutor)
      └─ UIStateService
```

SSH services are created at component level in `MainApplicationPage`, not at app
bootstrap.

### Agent Lifecycle

States: `Provisioning` → `Idle` → `Active` → `Running` | `Error`

1. **Provisioning**: Background async - checks git/auth, finds or creates a
   GitHub Codespace (reuses existing `claudinator-*` codespaces when possible)
2. **Idle**: Codespace ready, no SSH session
3. **Active/Running**: Connected via SSH, terminal session active
4. **Error**: Failed at any stage, stores `errorMessage`

Key methods on AgentService:

- `createAgentWithAutoCodespace()` - Non-blocking creation
- `attachSSHSession()` / `detachSSHSession()` - SSH lifecycle
- `findAvailableCodespace()` - Reuse strategy: prefers running over stopped

### SSH/Terminal Architecture

**SSH Connection** (`ssh-connection-service.ts`): Spawns Deno child processes
using `script -qec "stty cols X rows Y; gh codespace ssh -c \"NAME\""`. The
`script` command creates a real PTY (avoids pseudo-terminal warnings). Input is
sent via `sendKeystroke()` through a piped stdin writer. Terminal resize uses
ANSI escape sequence `ESC[8;ROWS;COLSt`.

**Terminal Service** (`terminal-service.ts`): Manages terminal state per session.
Runs an async **output pump** that continuously reads from the SSH output stream,
passes data through the TTY service, and triggers UI callbacks on state changes.

**TTY Service** (`tty-service.ts`): Full ANSI escape sequence parser
implementing a state machine (Normal → Escape → CSI/OSC). Manages a
**dual-buffer system** (primary + alternate) for TUI app support (vim, top).
Each buffer tracks lines of characters with per-character text attributes
(colors, bold, underline). Handles cursor movement, scroll regions (DECSTBM),
screen clearing, SGR color codes, and mode switching (1047/1049 alternate
buffer).

### UI Architecture

**Component hierarchy**:

```
AppContainer → MainApplicationPage
  ├─ AgentList (sidebar - agent selection)
  ├─ TileContainer (grid of AgentTile components)
  │   └─ AgentTile → DetailsMode | ShellMode
  │       └─ ShellMode → TtyTerminal (renders TTY buffer lines)
  ├─ HelpBar (keyboard hints)
  └─ ErrorModal (overlay)
```

**UIStateService** tracks: focus area (Sidebar vs Tile), selected/focused
indices, display mode per agent (Details vs Shell), error modal state. Tab key
cycles focus between Sidebar and Tile.

**Terminal rendering**: `TtyTerminal` reads visible lines from the TTY buffer and
renders them with Ink, translating ANSI attributes to Ink color components.
Input from `useInput()` hook is forwarded to SSH via `sendKeystroke()`.

## Logging

Logger at `/src/logger/logger.ts` writes to `~/.claudinator/log.txt`. Import
via relative path. Levels: `info`, `warn`, `error`, `debug`, `log` (alias for
info). Falls back to `console.error()` on write failure.

## Code Organization Standards

### Class Member Order

1. Properties (public → protected → private)
2. Constructor
3. Public methods
4. Protected methods
5. Private methods

### Documentation

All methods MUST have JSDoc with `@param`, `@returns`, and `@throws` tags.

### React Props Pattern

**ALWAYS** include explicit type annotations on destructured props:

```typescript
export const Component: React.FC<Props> = ({ prop1, prop2 }: Props) => { ... };
```

This is REQUIRED for all functional components (including forwardRef) to enable
IntelliSense.

### Imports

All imports use **relative paths** (no path aliases). Deno import map in
`deno.json` only maps external packages (`@std/assert`, `react`, `ink`,
`octokit`, etc.).

## Task Engine - Procedure Rules

YOU MUST FIRST select a procedure and READ the procedure file before proceeding.

- **Research** (`.claude/rules/research-procedure.md`): Understanding codebase,
  gathering information, no code changes
- **Coding** (`.claude/rules/coding-procedure.md`): Adding features, fixing
  bugs, refactoring, performance
- **Debug** (`.claude/rules/debug-procedure.md`): Fixing specific bugs,
  understanding failures

## Important Reminders

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary
- ALWAYS prefer editing existing files to creating new ones
- NEVER proactively create documentation files unless explicitly requested
- Follow existing code patterns and conventions in the codebase
- Always write tests for new functionality
- Clean up any temporary test code after debugging
