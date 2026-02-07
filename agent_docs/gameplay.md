# Gameplay

Breakout game mechanics and tuning values, all in `src/game/scenes/Game.ts`.

## State Machine

```
[idle] --pointerdown--> [playing]
[playing] --ball hits bottom, lives > 0--> [idle]
[playing] --ball hits bottom, lives == 0--> [gameOver]
[playing] --all bricks destroyed--> [win]
[gameOver | win] --pointerdown--> scene.restart() --> [idle]
```

State is a `GameState` string union: `'idle' | 'playing' | 'gameOver' | 'win'`.

## Game Objects

- **Paddle**: `Physics.Arcade.Image`, immovable, follows mouse X (clamped 60-964), at y=720
- **Ball**: `Physics.Arcade.Image`, bounce=1, collideWorldBounds, onWorldBounds for bottom detection
- **Bricks**: `Physics.Arcade.StaticGroup`, 10 cols x 5 rows, horizontally centered, starting at y=60

## Textures

Generated at runtime via `Graphics.generateTexture()`, no static assets:
- `'paddle'`: white rounded rect 120x20
- `'ball'`: white circle radius 8
- `'brick'`: white rounded rect 80x28, tinted per row (red, orange, yellow, green, blue)

## Collisions

All collision callbacks guard on `state === 'playing'` to prevent side effects during idle/gameOver/win.

- **Ball <-> Paddle** (`hitPaddle`): recalculates ball angle based on hit offset (-60 to +60 degrees)
- **Ball <-> Bricks** (`hitBrick`): destroys brick, adds score, scales ball speed by multiplier, checks win
- **World bounds** (`worldbounds` event): bottom edge triggers `loseLife()`

## Tuning Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `INITIAL_BALL_SPEED` | 700 | Launch speed in px/s |
| `SPEED_MULTIPLIER` | 1.02 | Ball speed multiplier per brick hit |
| `INITIAL_LIVES` | 3 | Starting lives |
| `POINTS_PER_BRICK` | 10 | Score per brick |
| `BRICK_COLS` / `BRICK_ROWS` | 10 / 5 | Grid dimensions |
| `BRICK_W` / `BRICK_H` | 80 / 28 | Brick pixel size |
| `BRICK_PAD` | 8 | Gap between bricks |
| `BRICK_TOP_Y` | 60 | Top row Y position |

## Key Methods

- `create()`: generates textures, creates objects, sets up colliders/input/UI, inits state
- `update()`: in idle state, keeps ball attached to paddle
- `resetBall()`: repositions ball on paddle, resets speed to initial, sets state to idle
- `launchBall()`: fires ball at random angle (-60 to +60 from vertical), sets state to playing
- `hitPaddle()`: adjusts ball angle based on where it hit the paddle
- `hitBrick()`: destroys brick, updates score, increases speed, checks for win condition
- `loseLife()`: decrements lives, resets ball or triggers game over

## UI

- Top-left: `Score: N`
- Top-right: `Lives: N`
- Center: context message (Click to Launch / Game Over / You Win)
