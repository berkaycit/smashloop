# Architecture

## Entry Flow

`index.html` -> `src/main.ts` -> `src/game/main.ts` -> scene classes

- `src/main.ts` -- Bootstrap: waits for DOMContentLoaded, calls `StartGame()` targeting `#game-container`
- `src/game/main.ts` -- Phaser config: 1024x768, AUTO renderer, FIT scale, Arcade physics (no gravity), bg `#1a1a2e`
- `src/game/scenes/Game.ts` -- Single scene containing all breakout game logic

## Scene Structure (Game.ts)

All game logic lives in one scene class. No separate entity classes.

**Properties**: state (FSM), paddle, ball, bricks (static group), score/lives counters, ballSpeed, UI text objects

**Lifecycle**:
- `create()` -- texture generation, object creation, collider setup, input binding, UI, state init
- `update()` -- only used to keep ball attached to paddle in idle state

**Private methods**: `generateTextures`, `createBricks`, `resetBall`, `launchBall`, `stopBall`, `hitPaddle`, `hitBrick`, `loseLife`

**Accessor**: `ballBody` getter centralizes the `Physics.Arcade.Body` cast

**Layout**: positions derived from `this.scale` (width/height), not hardcoded pixel values. Tuning constants (speeds, sizes, counts) defined as module-level consts.

## Runtime Textures

No static image assets. All textures (paddle, ball, brick) generated via `Graphics.generateTexture()` in `create()`, guarded to run only once (textures persist across `scene.restart()`). Bricks tinted per row using `setTint()`.

## Physics

Arcade physics with no gravity. Ball has bounce=1 and collideWorldBounds. Paddle is immovable. Bricks use a static group. World bounds event detects ball falling off bottom edge.

## Vite Config

Split into `vite/config.dev.mjs` and `vite/config.prod.mjs`. Phaser bundled as separate chunk. Production uses Terser.

## Key Technical Details

- TypeScript strict mode (ES2020 target, ESNext module)
- Phaser 3.90.0
- Purely client-side, no backend
- Deploy by uploading `dist/` to any static server
