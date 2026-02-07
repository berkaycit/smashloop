import { GameObjects, Physics, Scene } from 'phaser';
import { emitBrickShards, emitImpactSparks } from '../particles';

type GameState = 'idle' | 'playing' | 'gameOver' | 'win';

const INITIAL_BALL_SPEED = 700;
const SPEED_MULTIPLIER = 1.02;
const BRICK_COLS = 10;
const BRICK_ROWS = 5;
const BRICK_W = 80;
const BRICK_H = 28;
const BRICK_PAD = 8;
const BRICK_TOP_Y = 60;
const POINTS_PER_BRICK = 10;
const INITIAL_LIVES = 3;
const BALL_OFFSET_Y = 24;
const PADDLE_HALF_W = 60;
const MAX_BOUNCE_ANGLE = 60;
const ROW_TINTS = [0xff4444, 0xff8844, 0xffcc00, 0x44cc44, 0x4488ff];
const BALL_TINT = 0xffeb3b;
const PADDLE_TINT = 0x00e5ff;

export class Game extends Scene {
    private state: GameState = 'idle';
    private paddle!: Physics.Arcade.Image;
    private ball!: Physics.Arcade.Image;
    private bricks!: Physics.Arcade.StaticGroup;
    private scoreText!: GameObjects.Text;
    private livesText!: GameObjects.Text;
    private messageText!: GameObjects.Text;
    private score = 0;
    private lives = INITIAL_LIVES;
    private ballSpeed = INITIAL_BALL_SPEED;

    private ballTrail!: GameObjects.Graphics;
    private trailRing: number[] = [];
    private trailIndex = 0;
    private faceGfx!: GameObjects.Graphics;
    private lastBlinkTime = 0;
    private eyeScaleY = 1;
    private blinkTween: Phaser.Tweens.Tween | null = null;
    private mouthCurve = 0.3;
    private lastPaddleHitTime = 0;
    private prevPaddleX = 0;
    private confettiEmitter!: GameObjects.Particles.ParticleEmitter;
    private bgFlash!: GameObjects.Rectangle;

    constructor() {
        super('Game');
    }

    create() {
        this.generateTextures();

        const { width, height } = this.scale;
        const centerX = width / 2;

        // Background flash overlay (depth 0)
        this.bgFlash = this.add.rectangle(centerX, height / 2, width, height, 0xffffff, 0);
        this.bgFlash.setDepth(0);

        // Ball trail (depth 1)
        this.ballTrail = this.add.graphics();
        this.ballTrail.setDepth(1);
        this.trailRing = [];
        this.trailIndex = 0;

        this.paddle = this.physics.add.image(centerX, height - 48, 'paddle');
        const paddleBody = this.paddle.body as Physics.Arcade.Body;
        paddleBody.setImmovable(true);
        paddleBody.setCollideWorldBounds(true);
        this.paddle.setTint(PADDLE_TINT);
        this.paddle.setDepth(4);

        this.ball = this.physics.add.image(centerX, height - 48 - BALL_OFFSET_Y, 'ball');
        const ballBody = this.ball.body as Physics.Arcade.Body;
        ballBody.setBounce(1);
        ballBody.setCollideWorldBounds(true);
        ballBody.onWorldBounds = true;
        this.ball.setTint(BALL_TINT);
        this.ball.setDepth(3);

        this.bricks = this.physics.add.staticGroup();
        this.createBricks();

        this.physics.add.collider(this.ball, this.paddle, this.hitPaddle, undefined, this);
        this.physics.add.collider(this.ball, this.bricks, this.hitBrick, undefined, this);

        this.physics.world.on(
            'worldbounds',
            (_body: Physics.Arcade.Body, _up: boolean, down: boolean) => {
                if (down && this.state === 'playing') this.loseLife();
            },
        );

        // Confetti emitter (depth 6)
        this.confettiEmitter = this.add.particles(0, 0, 'particle', {
            speed: { min: 80, max: 200 },
            angle: { min: 220, max: 320 },
            lifespan: 500,
            scale: { start: 1.2, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: [0xff4444, 0xff8844, 0xffcc00, 0x44cc44, 0x4488ff, 0xff44ff],
            emitting: false,
        });
        this.confettiEmitter.setDepth(6);

        // Paddle face graphics (depth 5)
        this.faceGfx = this.add.graphics();
        this.faceGfx.setDepth(5);

        // UI text (depth 10)
        this.scoreText = this.add
            .text(16, 16, 'Score: 0', { fontSize: '20px', color: '#ffffff' })
            .setDepth(10);
        this.livesText = this.add
            .text(width - 16, 16, `Lives: ${INITIAL_LIVES}`, { fontSize: '20px', color: '#ffffff' })
            .setOrigin(1, 0)
            .setDepth(10);
        this.messageText = this.add
            .text(centerX, height / 2, 'Click to Launch', { fontSize: '32px', color: '#ffffff' })
            .setOrigin(0.5)
            .setDepth(10);

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            this.paddle.x = Phaser.Math.Clamp(pointer.x, PADDLE_HALF_W, width - PADDLE_HALF_W);
            if (this.state === 'idle') {
                this.ball.x = this.paddle.x;
            }
        });

        this.input.on('pointerdown', () => {
            if (this.state === 'idle') {
                this.launchBall();
            } else if (this.state === 'gameOver' || this.state === 'win') {
                this.scene.restart();
            }
        });

        this.score = 0;
        this.lives = INITIAL_LIVES;
        this.ballSpeed = INITIAL_BALL_SPEED;
        this.state = 'idle';
        this.prevPaddleX = this.paddle.x;
        this.lastBlinkTime = this.time.now;
        this.lastPaddleHitTime = 0;
        this.mouthCurve = 0.3;
        this.eyeScaleY = 1;
        this.blinkTween = null;
    }

    update() {
        if (this.state === 'idle') {
            this.ball.x = this.paddle.x;
            this.ball.y = this.paddle.y - BALL_OFFSET_Y;
        }

        // Paddle squash & stretch
        const dx = this.paddle.x - this.prevPaddleX;
        const stretch = Phaser.Math.Clamp(1 + Math.abs(dx) * 0.008, 1.0, 1.3);
        this.paddle.setScale(stretch, 1 / stretch);
        this.prevPaddleX = this.paddle.x;

        // Ball stretch, rotation, and trail (playing state only)
        if (this.state === 'playing') {
            const vx = this.ballBody.velocity.x;
            const vy = this.ballBody.velocity.y;
            const speed = this.ballBody.speed;

            if (speed > 0) {
                this.ball.setRotation(Math.atan2(vy, vx));
                const ballStretch = Phaser.Math.Clamp(1 + speed * 0.0004, 1.0, 1.4);
                this.ball.setScale(ballStretch, 1 / ballStretch);
            }

            // Ball trail (ring buffer: [x0, y0, x1, y1, ...], max 10 points = 20 values)
            const ri = this.trailIndex * 2;
            this.trailRing[ri] = this.ball.x;
            this.trailRing[ri + 1] = this.ball.y;
            this.trailIndex = (this.trailIndex + 1) % 10;
            this.drawTrail();
        }

        if (this.time.now - this.lastBlinkTime > Phaser.Math.Between(2000, 5000)) {
            this.lastBlinkTime = this.time.now;
            this.triggerBlink();
        }

        // Mouth expression based on ball distance
        if (this.state === 'playing') {
            const ballDistY = this.ball.y - this.paddle.y;
            const timeSinceHit = this.time.now - this.lastPaddleHitTime;
            if (timeSinceHit < 500) {
                this.mouthCurve = Phaser.Math.Linear(1, 0.3, timeSinceHit / 500);
            } else {
                // ballDistY is negative when ball is above paddle
                const distFactor = Phaser.Math.Clamp(-ballDistY / 600, 0, 1);
                this.mouthCurve = Phaser.Math.Linear(0, 0.3, distFactor);
            }
        } else if (this.state === 'idle') {
            this.mouthCurve = 0.3;
        }

        this.drawFace();
    }

    private get ballBody(): Physics.Arcade.Body {
        return this.ball.body as Physics.Arcade.Body;
    }

    private ballImpactFx(bgAlpha: number, bgDuration: number) {
        this.ball.setTint(0xffffff);
        this.time.delayedCall(60, () => this.ball.setTint(BALL_TINT));

        this.tweens.add({
            targets: this.ball,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 80,
            yoyo: true,
            ease: 'Cubic.Out',
        });

        this.bgFlash.setAlpha(bgAlpha);
        this.tweens.add({
            targets: this.bgFlash,
            alpha: 0,
            duration: bgDuration,
            ease: 'Linear',
        });
    }

    private triggerBlink(hold = 0) {
        if (this.blinkTween?.isPlaying()) return;
        this.blinkTween = this.tweens.add({
            targets: this,
            eyeScaleY: 0,
            duration: hold ? 60 : 80,
            yoyo: true,
            ease: 'Cubic.Out',
            hold,
        });
    }

    private generateTextures() {
        if (this.textures.exists('paddle')) return;

        const g = this.add.graphics();
        g.fillStyle(0xffffff);

        g.fillRoundedRect(0, 0, PADDLE_HALF_W * 2, 20, 6);
        g.generateTexture('paddle', PADDLE_HALF_W * 2, 20);
        g.clear();

        g.fillStyle(0xffffff);
        g.fillCircle(8, 8, 8);
        g.generateTexture('ball', 16, 16);
        g.clear();

        g.fillStyle(0xffffff);
        g.fillRoundedRect(0, 0, BRICK_W, BRICK_H, 4);
        g.generateTexture('brick', BRICK_W, BRICK_H);
        g.clear();

        g.fillStyle(0xffffff);
        g.fillCircle(2, 2, 2);
        g.generateTexture('particle', 4, 4);
        g.clear();

        g.fillStyle(0xffffff);
        g.fillCircle(3, 3, 3);
        g.generateTexture('spark', 6, 6);
        g.clear();

        g.fillStyle(0xffffff);
        g.fillRect(0, 0, 8, 4);
        g.generateTexture('shard', 8, 4);

        g.destroy();
    }

    private createBricks() {
        const totalW = BRICK_COLS * BRICK_W + (BRICK_COLS - 1) * BRICK_PAD;
        const startX = (this.scale.width - totalW) / 2 + BRICK_W / 2;

        for (let row = 0; row < BRICK_ROWS; row++) {
            for (let col = 0; col < BRICK_COLS; col++) {
                const x = startX + col * (BRICK_W + BRICK_PAD);
                const y = BRICK_TOP_Y + row * (BRICK_H + BRICK_PAD);
                const brick = this.bricks.create(x, y, 'brick') as Physics.Arcade.Image;
                brick.setTint(ROW_TINTS[row]);
                brick.setDepth(2);

                // Entrance animation
                brick.setScale(0);
                brick.setRotation(Phaser.Math.FloatBetween(-0.1, 0.1));
                const delay = row * 80 + col * 30 + Phaser.Math.Between(0, 40);
                this.tweens.add({
                    targets: brick,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0,
                    ease: 'Back.Out',
                    duration: 600,
                    delay,
                });
            }
        }
    }

    private resetBall() {
        this.ball.setPosition(this.paddle.x, this.paddle.y - BALL_OFFSET_Y);
        this.ballBody.setVelocity(0);
        this.ballSpeed = INITIAL_BALL_SPEED;
        this.state = 'idle';
        this.messageText.setText('Click to Launch').setVisible(true);
        this.clearTrail();
        this.ball.setScale(1);
        this.ball.setRotation(0);
        this.ball.setTint(BALL_TINT);
    }

    private launchBall() {
        const angle = Phaser.Math.Between(-MAX_BOUNCE_ANGLE, MAX_BOUNCE_ANGLE);
        const rad = Phaser.Math.DegToRad(angle - 90);
        this.ballBody.setVelocity(Math.cos(rad) * this.ballSpeed, Math.sin(rad) * this.ballSpeed);
        this.state = 'playing';
        this.messageText.setVisible(false);
    }

    private stopBall(message: string) {
        this.ballBody.setVelocity(0);
        this.messageText.setText(message).setVisible(true);
        this.clearTrail();
    }

    private hitPaddle(
        _ball: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    ) {
        if (this.state !== 'playing') return;
        const ball = _ball as Physics.Arcade.Image;
        const diff = ball.x - this.paddle.x;
        const angle = Phaser.Math.Clamp(diff, -MAX_BOUNCE_ANGLE, MAX_BOUNCE_ANGLE);
        const rad = Phaser.Math.DegToRad(angle - 90);
        const speed = this.ballBody.speed || this.ballSpeed;
        this.ballBody.setVelocity(Math.cos(rad) * speed, Math.sin(rad) * speed);

        this.ballImpactFx(0.03, 150);
        this.confettiEmitter.emitParticleAt(this.ball.x, this.paddle.y, 8);
        this.lastPaddleHitTime = this.time.now;
        this.mouthCurve = 1;
        this.triggerBlink(150);
    }

    private hitBrick(
        _ball: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
        _brick: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    ) {
        if (this.state !== 'playing') return;
        const brick = _brick as Physics.Arcade.Image;
        const bx = brick.x;
        const by = brick.y;
        const tint = brick.tintTopLeft;
        brick.destroy();

        emitImpactSparks(this, bx, by, tint);
        emitBrickShards(this, bx, by, tint);

        this.score += POINTS_PER_BRICK;
        this.scoreText.setText(`Score: ${this.score}`);

        this.ballSpeed *= SPEED_MULTIPLIER;
        const currentSpeed = this.ballBody.speed;
        if (currentSpeed > 0) {
            const scale = this.ballSpeed / currentSpeed;
            this.ballBody.setVelocity(
                this.ballBody.velocity.x * scale,
                this.ballBody.velocity.y * scale,
            );
        }

        this.ballImpactFx(0.06, 200);

        if (this.bricks.countActive() === 0) {
            this.state = 'win';
            this.stopBall('You Win!\nClick to Restart');
            this.mouthCurve = 1;
        }
    }

    private clearTrail() {
        this.trailRing = [];
        this.trailIndex = 0;
        this.ballTrail.clear();
    }

    private drawTrail() {
        this.ballTrail.clear();
        const count = Math.min(this.trailRing.length / 2, 10);
        if (count < 2) return;

        for (let i = 1; i < count; i++) {
            const pi = ((this.trailIndex - count + i - 1 + 10) % 10) * 2;
            const ci = ((this.trailIndex - count + i + 10) % 10) * 2;
            const t = i / count;
            this.ballTrail.lineStyle(t * 3, BALL_TINT, t * 0.5);
            this.ballTrail.beginPath();
            this.ballTrail.moveTo(this.trailRing[pi], this.trailRing[pi + 1]);
            this.ballTrail.lineTo(this.trailRing[ci], this.trailRing[ci + 1]);
            this.ballTrail.strokePath();
        }
    }

    private drawFace() {
        this.faceGfx.clear();

        const px = this.paddle.x;
        const py = this.paddle.y;

        const eyeSpacing = 12;
        const eyeR = 7;
        const pupilR = 3;
        const leftEyeX = px - eyeSpacing;
        const rightEyeX = px + eyeSpacing;
        const eyeY = py - 4;

        if (this.eyeScaleY < 0.2) {
            // Blink: horizontal lines
            this.faceGfx.lineStyle(2, 0xffffff, 1);
            this.faceGfx.beginPath();
            this.faceGfx.moveTo(leftEyeX - 4, eyeY);
            this.faceGfx.lineTo(leftEyeX + 4, eyeY);
            this.faceGfx.strokePath();
            this.faceGfx.beginPath();
            this.faceGfx.moveTo(rightEyeX - 4, eyeY);
            this.faceGfx.lineTo(rightEyeX + 4, eyeY);
            this.faceGfx.strokePath();
        } else {
            // Open eyes (white circles)
            this.faceGfx.fillStyle(0xffffff, 1);
            this.faceGfx.fillCircle(leftEyeX, eyeY, eyeR);
            this.faceGfx.fillCircle(rightEyeX, eyeY, eyeR);

            // Pupils tracking ball
            const angle = Math.atan2(this.ball.y - eyeY, this.ball.x - px);
            const maxOffset = 3;
            const ox = Math.cos(angle) * maxOffset;
            const oy = Math.sin(angle) * maxOffset;

            this.faceGfx.fillStyle(0x000000, 1);
            this.faceGfx.fillCircle(leftEyeX + ox, eyeY + oy, pupilR);
            this.faceGfx.fillCircle(rightEyeX + ox, eyeY + oy, pupilR);
        }

        // Mouth
        this.faceGfx.lineStyle(1.5, 0xffffff, 0.9);
        if (this.mouthCurve > 0.15) {
            // Smile arc: center at paddle center, radius 8, 20-160 degrees
            this.faceGfx.beginPath();
            this.faceGfx.arc(px, py, 8, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
            this.faceGfx.strokePath();
        } else {
            // Neutral: straight line
            this.faceGfx.beginPath();
            this.faceGfx.moveTo(px - 6, py + 3);
            this.faceGfx.lineTo(px + 6, py + 3);
            this.faceGfx.strokePath();
        }
    }

    private loseLife() {
        this.lives--;
        this.livesText.setText(`Lives: ${this.lives}`);

        if (this.lives > 0) {
            this.resetBall();
        } else {
            this.state = 'gameOver';
            this.stopBall('Game Over\nClick to Restart');
            this.mouthCurve = 0;
        }
    }
}
