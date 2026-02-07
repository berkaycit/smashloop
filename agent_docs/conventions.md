# Conventions

## Naming

- **Scenes**: PascalCase class names extending `Phaser.Scene`, scene key matches class name (e.g., `class Game` → `super('Game')`)
- **Assets**: kebab-case filenames in `public/assets/`, camelCase keys when loading (e.g., `this.load.image('background', 'bg.png')`)
- **Config objects**: `const` with explicit Phaser type annotation (e.g., `const config: Types.Core.GameConfig`)
- **Functions**: camelCase, PascalCase only for constructors/factories (e.g., `StartGame`)

## Code Patterns

- One scene per file in `src/game/scenes/`
- Asset loading in `preload()`, rendering/logic in `create()` and `update()`
- Set asset base path once with `this.load.setPath('assets')` instead of repeating paths
- Chain Phaser methods (e.g., `.setOrigin(0.5).setDepth(100)`)
- Phaser is imported destructured: `import { Scene } from 'phaser'`

## Formatting (Prettier)

- 4 spaces, single quotes, semicolons, trailing commas, 100 char line width
- Run `npm run format` — don't fix style manually

## Linting (ESLint)

- `no-explicit-any` is an error — use proper types
- Run `npm run lint:fix` for auto-fixable issues

## Performance

- Phaser is bundled as a separate chunk (configured in Vite) — don't import Phaser in ways that break tree-shaking
- Prefer `this.load.setPath()` over full paths per asset to reduce string duplication
- In `update()` loops: avoid object allocations, cache references, use object pools for frequently created/destroyed game objects
- Use Phaser's built-in physics and collision over custom math when possible
