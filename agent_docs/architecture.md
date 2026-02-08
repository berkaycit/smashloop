# Architecture

## Entry Flow

`index.html` -> `src/main.ts` -> `src/game/main.ts` -> scene classes

- `src/main.ts` -- Bootstrap: waits for DOMContentLoaded, calls `StartGame()` targeting `#game-container`
- `src/game/main.ts` -- Phaser config: 1024x768, AUTO renderer, FIT scale, Arcade physics (no gravity), bg `#1a1a2e`

## Scenes

- `scenes/Game.ts` -- Main breakout gameplay: paddle, ball, bricks, collisions, HP, bullets, end screen overlay
- `scenes/Upgrade.ts` -- Upgrade shop: spend coins on paddle HP, lives, width, shooting, coin multiplier

## Scene Structure (Game.ts)

All game logic lives in one scene class. No separate entity classes.

**Properties**: state (FSM), paddle, ball, bricks (static group), score/lives/coins counters, ballSpeed, paddleHp, ammo, bullets group, paddleBroken flag, UI text objects, visual effect references (trail, face, bgFlash, confetti emitter, hpBar)

**Lifecycle**:
- `create()` -- loads upgrades from persistence, texture generation, object creation, collider setup, emitters, input binding, UI, state init
- `update()` -- idle ball tracking, ball stretch/rotation/trail, bullet cleanup, HP bar drawing, face update

**Key methods**: `generateTextures`, `createBricks`, `drawHpBar`, `resetBall`, `updatePaddleTint`, `launchBall`, `stopBall`, `fireBullet`, `destroyBrick`, `breakPaddle`, `hitPaddle`, `hitBrick`, `hitBrickWithBullet`, `loseLife`, `showEndScreen`

**Accessor**: `ballBody` getter centralizes the `Physics.Arcade.Body` cast

**End screen**: rendered as overlay text objects within the Game scene (no separate scene). Saves coins to persistence, shows coins earned/total, Play Again and Upgrades buttons.

**Layout**: positions derived from `this.scale` (width/height), not hardcoded pixel values. Tuning constants (speeds, sizes, counts) defined as module-level consts. Bricks arranged in a heart shape via `HEART_SHAPE` bitmask (10 rows x 10 cols, 70 bricks). Row count derived from `HEART_SHAPE.length`; row tints use a rainbow gradient.

## Extracted Modules

- `ball-trail.ts` -- Ball trail renderer using a ring buffer of positions, drawn as fading line segments
- `paddle-face.ts` -- Paddle face with eyes (tracking ball), blink, mouth expressions, squash/stretch
- `visual-fx.ts` -- Background flash overlay, confetti emitter factory, ball impact flash/scale effect
- `particles.ts` -- Disposable particle emitters for brick/paddle destruction (sparks, shards)
- `persistence.ts` -- localStorage save/load for GameProgress (coins, upgrade levels)
- `upgrades.ts` -- Upgrade definitions (key, name, maxLevel, cost scaling, effect labels) and cost calculation

## Runtime Textures

No static image assets. All textures (paddle, ball, brick, particle, spark, shard, bullet) generated via `Graphics.generateTexture()` in `create()`. Paddle texture regenerated on each restart (width varies by upgrade). Other textures guarded to generate only once.

## Physics

Arcade physics with no gravity. Ball has bounce=1 and collideWorldBounds. Paddle is immovable. Bricks use a static group. Bullets in a dynamic group with no gravity. World bounds event detects ball falling off bottom edge.

## Vite Config

Split into `vite/config.dev.mjs` and `vite/config.prod.mjs`. Phaser bundled as separate chunk. Production uses Terser.

## Key Technical Details

- TypeScript strict mode (ES2020 target, ESNext module)
- Phaser 3.90.0
- Purely client-side, no backend
- Deploy by uploading `dist/` to any static server
