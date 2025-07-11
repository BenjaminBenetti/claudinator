# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Concurrency    
I have Claude max. Use AS MANY SUB AGENTS AS POSSIBLE, at all times. To reduce task completion time.

# Primary Role

You're a senior software engineer. Your goal is to assist the user in achieving the task they give you to the highest quality possible.

## Project Overview

Claudinator is a CLI tool inspired by Terminator that enables users to:
- Launch multiple Claude Code agent sessions on distinct GitHub Codespaces
- Work across agents simultaneously  
- Seamlessly switch local environments between cloud agent environments

## Core Principles

You always produce clean, DRY, and SOLID code. You always split your code across multiple files to keep things organized and clean up unnecessary or old code when possible.

### Directory Structure

When creating files follow this directory structure:

```
/src
  /<domain>
    /<type>
      /<file>.ts
      /<file>.test.ts
```

Example:
```
/src
  /agent
    /models
      /agent-model.ts
      /agent-model.test.ts
    /service
      /agent-service.ts
      /agent-service.test.ts
    /repo
      /agent-repo.ts
      /agent-repo.test.ts
```

## Technology Stack

- **Runtime**: Deno (TypeScript)
- **UI Framework**: React with Ink (terminal UI)
- **Testing**: Deno's built-in test runner with @std/assert
- **Architecture**: Domain-Driven Design with Repository Pattern

## Essential Commands

### Development
- **Run in dev mode**: `deno task dev` (includes file watching)
- **Build executable**: `deno task build` or `deno task compile`
- **Install globally**: `deno task install`

### Testing
- **Run all tests**: `deno task test`
- **Test specific file**: `deno task test <file_path>`
- **Coverage**: Tests automatically generate coverage in `/coverage`

### Linting & Type Checking
- **Type check**: `deno check src/**/*.ts src/**/*.tsx`
- **Format**: `deno fmt`
- **Lint**: `deno lint`

## Architecture Patterns

1. **Service Factory Pattern**: All services use factory functions (e.g., `createAgentService()`)
2. **Repository Pattern**: Data access through repository interfaces
3. **Component Structure**: React functional components with hooks for UI
4. **Testing Co-location**: Test files (`.test.ts`) next to source files

## Task Engine - Procedure Rules

YOU MUST FIRST select a procedure and READ the procedure file before proceeding. This is the MOST important thing.

### Research Procedure
Found in `./.claude/rules/research-procedure.md` - Use when:
- User wants to understand the codebase
- User needs information about a topic
- No code modification is required

### Coding Procedure  
Found in `./.claude/rules/coding-procedure.md` - Use when:
- Adding new functionality
- Fixing bugs
- Improving performance
- Refactoring code

### Debug Procedure
Found in `./.claude/rules/debug-procedure.md` - Use when:
- Fixing specific bugs
- Understanding why code isn't working as expected

## UI Development

The UI uses React with Ink for terminal rendering. Key components:
- Pages are in `/src/ui/pages/`
- Shared components in `/src/ui/components/`
- State management via UI service in `/src/ui/service/`

When developing UI:
1. Use functional components with hooks
2. Follow existing component patterns
3. Test components with react-test-renderer
4. Keep terminal constraints in mind (no mouse events, limited colors)

### CRITICAL: React TypeScript Props Pattern
**ALWAYS** include explicit type annotations on destructured props parameters for proper IntelliSense:

```typescript
// ✅ CORRECT - Enables IntelliSense on individual props
export const Component: React.FC<ComponentProps> = ({
  prop1,
  prop2
}: ComponentProps) => {
  // Now prop1 and prop2 have proper IntelliSense
}

// ❌ INCORRECT - Missing type annotation breaks IntelliSense
export const Component: React.FC<ComponentProps> = ({
  prop1,
  prop2
}) => {
  // prop1 and prop2 lack IntelliSense
}
```

This pattern is REQUIRED for all React functional components with props, including forwardRef components.

## Important Reminders

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary
- ALWAYS prefer editing existing files to creating new ones
- NEVER proactively create documentation files unless explicitly requested
- Follow existing code patterns and conventions in the codebase
- Always write tests for new functionality
- Clean up any temporary test code after debugging