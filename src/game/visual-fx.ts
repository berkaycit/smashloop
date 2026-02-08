import Phaser from 'phaser';

export function createBgFlash(scene: Phaser.Scene): Phaser.GameObjects.Rectangle {
    const { width, height } = scene.scale;
    const flash = scene.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0);
    flash.setDepth(0);
    return flash;
}

export function createConfettiEmitter(
    scene: Phaser.Scene,
): Phaser.GameObjects.Particles.ParticleEmitter {
    const emitter = scene.add.particles(0, 0, 'particle', {
        speed: { min: 80, max: 200 },
        angle: { min: 220, max: 320 },
        lifespan: 500,
        scale: { start: 1.2, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xff4455, 0xff9922, 0xffcc11, 0x44dd44, 0x4499ff, 0x9944ff],
        emitting: false,
    });
    emitter.setDepth(6);
    return emitter;
}

export function ballImpactFx(
    scene: Phaser.Scene,
    ball: Phaser.Physics.Arcade.Image,
    bgFlash: Phaser.GameObjects.Rectangle,
    ballTint: number,
    bgAlpha: number,
    bgDuration: number,
): void {
    ball.setTint(0xffffff);
    scene.time.delayedCall(60, () => ball.setTint(ballTint));

    scene.tweens.add({
        targets: ball,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 80,
        yoyo: true,
        ease: 'Cubic.Out',
    });

    bgFlash.setAlpha(bgAlpha);
    scene.tweens.add({
        targets: bgFlash,
        alpha: 0,
        duration: bgDuration,
        ease: 'Linear',
    });
}
