# Architecture

## Entry Flow

`index.html` → `src/main.ts` → `src/game/main.ts` → scene classes

- `src/main.ts` — Bootstrap: waits for DOMContentLoaded, then calls `StartGame()` targeting the `#game-container` div
- `src/game/main.ts` — Phaser game configuration (1024x768, AUTO renderer, FIT scale mode) and scene registration
- `src/game/scenes/` — Phaser Scene classes containing game logic. Each scene has `preload()` for asset loading and `create()`/`update()` for gameplay

## Static Assets

Assets go in `public/assets/` and are loaded in scene `preload()` methods via `this.load.*()`. They are served at the `/assets/` path.

## Vite Config

Split into `vite/config.dev.mjs` and `vite/config.prod.mjs`. Both configure Phaser as a separate chunk for caching. Production config uses Terser for minification.

## Key Technical Details

- TypeScript strict mode is enabled (tsconfig target: ES2020, module: ESNext)
- Phaser 3.90.0 is the game framework
- No backend/database — this is a purely client-side game
- Deploy by uploading the `dist/` folder contents to any static web server
