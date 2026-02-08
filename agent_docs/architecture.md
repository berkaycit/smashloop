# Architecture

## Entry Flow

`index.html` -> `src/main.ts` -> `src/game/main.ts` -> scene classes

- `src/main.ts` -- Bootstrap: waits for DOMContentLoaded, calls `StartGame()` targeting `#game-container`
- `src/game/main.ts` -- Phaser config: 1024x768, AUTO renderer, FIT scale, Arcade physics (no gravity), bg `#1a1a2e`
- `src/game/scenes/Game.ts` -- Single scene containing all breakout game logic

## Scene Structure (Game.ts)

All game logic lives in one scene class. No separate entity classes.

**Properties**: state (FSM), paddle, ball, bricks (static group), score/lives counters, ballSpeed, UI text objects, juice state (trail ring buffer, face/blink/mouth, bgFlash, confetti emitter)

**Lifecycle**:
- `create()` -- texture generation, object creation, collider setup, emitters, input binding, UI, state init
- `update()` -- idle ball tracking, paddle stretch, ball stretch/rotation/trail, blink timer, mouth expression, face drawing

**Private methods**: `generateTextures`, `createBricks`, `resetBall`, `launchBall`, `stopBall`, `hitPaddle`, `hitBrick`, `loseLife`, `ballImpactFx`, `triggerBlink`, `clearTrail`, `drawTrail`, `drawFace`

**Accessor**: `ballBody` getter centralizes the `Physics.Arcade.Body` cast

**Layout**: positions derived from `this.scale` (width/height), not hardcoded pixel values. Tuning constants (speeds, sizes, counts) defined as module-level consts. Bricks arranged in a heart shape via `HEART_SHAPE` bitmask (10 rows x 10 cols, 70 bricks). Row count derived from `HEART_SHAPE.length`; row tints use a rainbow gradient.

## Particles (particles.ts)

Disposable particle emitters for brick destruction effects. Each function creates an emitter, calls `explode()`, then self-destructs via `time.delayedCall`.

- `emitImpactSparks` -- 8 spark particles at brick position with brick tint
- `emitBrickShards` -- 6 shard particles with gravity, rotation, and darkened tint variant

## Runtime Textures

No static image assets. All textures (paddle, ball, brick, particle, spark, shard) generated via `Graphics.generateTexture()` in `create()`, guarded to run only once (textures persist across `scene.restart()`). Bricks tinted per row, paddle tinted cyan, ball tinted yellow.

## Physics

Arcade physics with no gravity. Ball has bounce=1 and collideWorldBounds. Paddle is immovable. Bricks use a static group. World bounds event detects ball falling off bottom edge.

## Vite Config

Split into `vite/config.dev.mjs` and `vite/config.prod.mjs`. Phaser bundled as separate chunk. Production uses Terser.

## Key Technical Details

- TypeScript strict mode (ES2020 target, ESNext module)
- Phaser 3.90.0
- Purely client-side, no backend
- Deploy by uploading `dist/` to any static server
