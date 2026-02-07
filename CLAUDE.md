# CLAUDE.md

## Project Overview

Smashloop is an incremental breakout game built with Phaser 3, TypeScript, and Vite.

## Commands

```bash
npm run dev              # http://localhost:8080
npm run build            # production
npm run lint             # ESLint
npm run format           # Prettier
```

## When to Read Agent Docs

| Task | Read |
|------|------|
| Project structure, components | `agent_docs/architecture.md` |
| Code patterns, naming, performance | `agent_docs/conventions.md` |
| Recent changes history | `agent_docs/memory-bank.md` |

## Rules

### Think Before Coding
- State assumptions explicitly; if uncertain, use the `AskUserQuestion` tool rather than guess
- When ambiguity exists, present multiple interpretations via `AskUserQuestion` — don't pick silently
- Push back if a simpler approach exists; stop and ask via `AskUserQuestion` when confused

### Simplicity First
- No features, abstractions, or error handling beyond what was asked
- No speculative "flexibility" or "configurability"
- If 200 lines could be 50, rewrite it
- Only create an abstraction if it's actually needed

### Surgical Changes
- Touch only what you must; don't "improve" adjacent code, comments, or formatting
- Match existing style, even if you'd do it differently
- If you notice unrelated dead code, mention it — don't delete it
- Remove imports/variables/functions that YOUR changes made unused, not pre-existing dead code

### Goal-Driven Execution
- Define verifiable success criteria before implementing
- Write or run tests first to confirm the change works
- Every action should trace back to the user's stated goal

### General
- ALWAYS read and understand relevant files before proposing edits
- If critical info is needed and you suspect your knowledge may be outdated, fetch the latest docs via Context7 MCP first
- Prefer `npm run format` / `npm run lint:fix` over manual edits for style fixes
- Before writing new code, check for existing related methods/classes and reuse them
- Prefer clear function/variable names over inline comments
- After each change, do NOT run npm run build
- Don't use emojis

## Bash Guidelines

- Do NOT pipe output through `head`, `tail`, `less`, or `more`
- Do NOT use `| head -n X` or `| tail -n X` to truncate output — these cause buffering problems
- Let commands complete fully, or use `--max-lines` flags if the command supports them
- For log monitoring, prefer reading files directly rather than piping through filters
- Run commands directly without pipes when possible
- Use command-specific flags to limit output (e.g., `git log -n 10` instead of `git log | head -10`)
- Avoid chained pipes that can cause output to buffer indefinitely

## Architecture Patterns

- Use event-driven communication between decoupled systems (Phaser's `EventEmitter`)
- Use FSM (finite state machines) for game states and entity behaviors where state transitions are well-defined

## TypeScript

- Don't unnecessarily add `try`/`catch`
- Don't cast to `any`