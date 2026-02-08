import Phaser from 'phaser';

const MAX_POINTS = 10;
const TINT = 0xffeb3b;

export interface BallTrail {
    gfx: Phaser.GameObjects.Graphics;
    record(x: number, y: number): void;
    draw(): void;
    clear(): void;
}

export function createBallTrail(scene: Phaser.Scene): BallTrail {
    const gfx = scene.add.graphics();
    gfx.setDepth(1);

    let ring: number[] = [];
    let index = 0;

    return {
        gfx,
        record(x: number, y: number) {
            const ri = index * 2;
            ring[ri] = x;
            ring[ri + 1] = y;
            index = (index + 1) % MAX_POINTS;
        },
        draw() {
            gfx.clear();
            const count = Math.min(ring.length / 2, MAX_POINTS);
            if (count < 2) return;

            for (let i = 1; i < count; i++) {
                const pi = ((index - count + i - 1 + MAX_POINTS) % MAX_POINTS) * 2;
                const ci = ((index - count + i + MAX_POINTS) % MAX_POINTS) * 2;
                const t = i / count;
                gfx.lineStyle(t * 3, TINT, t * 0.5);
                gfx.beginPath();
                gfx.moveTo(ring[pi], ring[pi + 1]);
                gfx.lineTo(ring[ci], ring[ci + 1]);
                gfx.strokePath();
            }
        },
        clear() {
            ring = [];
            index = 0;
            gfx.clear();
        },
    };
}
