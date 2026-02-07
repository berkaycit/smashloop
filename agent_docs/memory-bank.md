# Memory Bank

Recent changes history for context across sessions.

## List

- **Summary**: Add juice effects and paddle face
- **Description**: Added visual polish to Game.ts: paddle/ball color tints, brick entrance tweens, squash/stretch on paddle and ball, ball trail (ring buffer), impact flash/scale bump/bgFlash pulse (extracted to `ballImpactFx`), confetti on paddle hit, and a paddle face with tracking eyes, blink, and smile/neutral mouth. New `particles.ts` module with disposable emitters (`emitImpactSparks`, `emitBrickShards`) for brick destruction. New textures: particle, spark, shard. Depth layering added across all game objects.

- **Summary**: Implement basic breakout game
- **Description**: Replaced template Phaser scene with a full breakout game. Game.ts rewritten with paddle (mouse-controlled), bouncing ball, 10x5 brick grid with row-colored tints, score/lives UI, and a state machine (idle/playing/gameOver/win). Textures generated at runtime via Graphics. Arcade physics added to main.ts config. Initial ball speed set to 700 px/s with x1.02 multiplier per brick hit.
