import Phaser from 'phaser';

export interface PaddleFace {
    gfx: Phaser.GameObjects.Graphics;
    update(
        paddle: Phaser.Physics.Arcade.Image,
        ball: Phaser.Physics.Arcade.Image,
        state: string,
        time: number,
    ): void;
    onPaddleHit(time: number): void;
    onGameOver(): void;
    onWin(): void;
    reset(time: number): void;
}

export function createPaddleFace(scene: Phaser.Scene): PaddleFace {
    const gfx = scene.add.graphics();
    gfx.setDepth(5);

    let lastBlinkTime = scene.time.now;
    let eyeScaleY = 1;
    let blinkTween: Phaser.Tweens.Tween | null = null;
    let mouthCurve = 0.3;
    let lastPaddleHitTime = 0;
    let prevPaddleX = scene.scale.width / 2;

    // We need a target object for the eyeScaleY tween since it's a local variable
    const tweenTarget = { eyeScaleY: 1 };

    function triggerBlink(hold = 0) {
        if (blinkTween?.isPlaying()) return;
        tweenTarget.eyeScaleY = 1;
        blinkTween = scene.tweens.add({
            targets: tweenTarget,
            eyeScaleY: 0,
            duration: hold ? 60 : 80,
            yoyo: true,
            ease: 'Cubic.Out',
            hold,
        });
    }

    function drawFace(paddle: Phaser.Physics.Arcade.Image, ball: Phaser.Physics.Arcade.Image) {
        gfx.clear();

        const px = paddle.x;
        const py = paddle.y;

        const eyeSpacing = 12;
        const eyeR = 7;
        const pupilR = 3;
        const leftEyeX = px - eyeSpacing;
        const rightEyeX = px + eyeSpacing;
        const eyeY = py - 4;

        eyeScaleY = tweenTarget.eyeScaleY;

        if (eyeScaleY < 0.2) {
            gfx.lineStyle(2, 0xffffff, 1);
            gfx.beginPath();
            gfx.moveTo(leftEyeX - 4, eyeY);
            gfx.lineTo(leftEyeX + 4, eyeY);
            gfx.strokePath();
            gfx.beginPath();
            gfx.moveTo(rightEyeX - 4, eyeY);
            gfx.lineTo(rightEyeX + 4, eyeY);
            gfx.strokePath();
        } else {
            gfx.fillStyle(0xffffff, 1);
            gfx.fillCircle(leftEyeX, eyeY, eyeR);
            gfx.fillCircle(rightEyeX, eyeY, eyeR);

            const angle = Math.atan2(ball.y - eyeY, ball.x - px);
            const maxOffset = 3;
            const ox = Math.cos(angle) * maxOffset;
            const oy = Math.sin(angle) * maxOffset;

            gfx.fillStyle(0x000000, 1);
            gfx.fillCircle(leftEyeX + ox, eyeY + oy, pupilR);
            gfx.fillCircle(rightEyeX + ox, eyeY + oy, pupilR);
        }

        gfx.lineStyle(1.5, 0xffffff, 0.9);
        if (mouthCurve > 0.15) {
            gfx.beginPath();
            gfx.arc(px, py, 8, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
            gfx.strokePath();
        } else {
            gfx.beginPath();
            gfx.moveTo(px - 6, py + 3);
            gfx.lineTo(px + 6, py + 3);
            gfx.strokePath();
        }
    }

    return {
        gfx,
        update(paddle, ball, state, time) {
            // Paddle squash & stretch
            const dx = paddle.x - prevPaddleX;
            const stretch = Phaser.Math.Clamp(1 + Math.abs(dx) * 0.008, 1.0, 1.3);
            paddle.setScale(stretch, 1 / stretch);
            prevPaddleX = paddle.x;

            // Blink timer
            if (time - lastBlinkTime > Phaser.Math.Between(2000, 5000)) {
                lastBlinkTime = time;
                triggerBlink();
            }

            // Mouth expression
            if (state === 'playing') {
                const ballDistY = ball.y - paddle.y;
                const timeSinceHit = time - lastPaddleHitTime;
                if (timeSinceHit < 500) {
                    mouthCurve = Phaser.Math.Linear(1, 0.3, timeSinceHit / 500);
                } else {
                    const distFactor = Phaser.Math.Clamp(-ballDistY / 600, 0, 1);
                    mouthCurve = Phaser.Math.Linear(0, 0.3, distFactor);
                }
            } else if (state === 'idle') {
                mouthCurve = 0.3;
            }

            drawFace(paddle, ball);
        },
        onPaddleHit(time) {
            lastPaddleHitTime = time;
            mouthCurve = 1;
            triggerBlink(150);
        },
        onGameOver() {
            mouthCurve = 0;
        },
        onWin() {
            mouthCurve = 1;
        },
        reset(time) {
            prevPaddleX = scene.scale.width / 2;
            lastBlinkTime = time;
            lastPaddleHitTime = 0;
            mouthCurve = 0.3;
            eyeScaleY = 1;
            tweenTarget.eyeScaleY = 1;
            blinkTween = null;
        },
    };
}
