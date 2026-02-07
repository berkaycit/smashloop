# CLAUDE.md

## Project Overview

Smashloop is an incremental breakout game built with Phaser 3, TypeScript, and Vite.

## Commands

```bash
npm install              # Install dependencies
npm run dev              # Start dev server with hot-reload at http://localhost:8080
npm run build            # Production build to dist/
npm run lint             # Run ESLint on src/
npm run lint:fix         # Run ESLint with auto-fix
npm run format           # Format src/**/*.ts with Prettier
```

## When to Read Agent Docs

| Task | Read |
|------|------|
| Project structure, components | `agent_docs/architecture.md` |

## Rules

- ALWAYS read and understand relevant files before proposing edits. Do not speculate about code you have not inspected
- If critical info is needed and you suspect your knowledge may be outdated, fetch the latest docs via Context7 MCP first
- Before writing new code, check for existing related methods/classes and reuse or modify them instead of duplicating functionality
- Avoid generic names; choose flexible, extensible naming for classes
- Prefer clear function/variable names over inline comments
- If a critical point is unclear, ask clarifying questions with options before implementing the plan
- Only create an abstraction if it’s actually needed
- Only make changes that are directly requested. Keep solutions simple and focused
- Avoid helper functions when a simple inline expression would suffice
- Ensure your changes are easy to verify
- After each change, do NOT run npm run build
- Don’t use emojis

## Bash Guidelines

- Do NOT pipe output through `head`, `tail`, `less`, or `more`
- Do NOT use `| head -n X` or `| tail -n X` to truncate output — these cause buffering problems
- Let commands complete fully, or use `--max-lines` flags if the command supports them
- For log monitoring, prefer reading files directly rather than piping through filters
- Run commands directly without pipes when possible
- Use command-specific flags to limit output (e.g., `git log -n 10` instead of `git log | head -10`)
- Avoid chained pipes that can cause output to buffer indefinitely

## TypeScript

- Don't unnecessarily add `try`/`catch`
- Don't cast to `any`