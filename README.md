# Smashloop

An incremental breakout game built with Phaser 3.

Play it online at [smashloop.netlify.app](https://smashloop.netlify.app).

## Setup

```bash
npm install
npm run dev
```

The game runs at `http://localhost:8080`.

For production build:

```bash
npm run build
```

Upload the `dist/` folder to any static server to deploy.

## How to Play

- Move the paddle with your mouse
- Click to launch the ball
- Break all bricks to complete the level
- Each level has a different brick layout and tougher bricks (3 levels: Heart, Space Invader, Skull)
- Spend earned coins on upgrades from the skill tree (paddle width, bullets, bombs, etc.)
- Your progress is saved automatically

## Tech Stack

- Phaser 3
- TypeScript
- Vite
