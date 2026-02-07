import Phaser from 'phaser';

export function emitImpactSparks(scene: Phaser.Scene, x: number, y: number, tint: number) {
    const emitter = scene.add.particles(x, y, 'spark', {
        speed: { min: 100, max: 300 },
        lifespan: 300,
        quantity: 8,
        scale: { start: 1, end: 0 },
        tint,
        emitting: false,
    });
    emitter.setDepth(6);
    emitter.explode(8);
    scene.time.delayedCall(400, () => emitter.destroy());
}

export function emitBrickShards(scene: Phaser.Scene, x: number, y: number, tint: number) {
    const darkTint = Phaser.Display.Color.ValueToColor(tint).darken(30).color;
    const emitter = scene.add.particles(x, y, 'shard', {
        speed: { min: 50, max: 200 },
        gravityY: 400,
        rotate: { start: 0, end: 360 },
        scale: { start: 1, end: 0.3 },
        lifespan: 800,
        tint: [tint, darkTint],
        emitting: false,
    });
    emitter.setDepth(6);
    emitter.explode(6);
    scene.time.delayedCall(900, () => emitter.destroy());
}
