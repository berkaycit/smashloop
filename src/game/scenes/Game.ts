import Phaser, { GameObjects, Physics, Scene } from 'phaser';
import { emitBrickShards, emitImpactSparks } from '../particles';
import { createBallTrail, type BallTrail } from '../ball-trail';
import { ballImpactFx, createBgFlash, createConfettiEmitter } from '../visual-fx';
import { createPaddleFace, type PaddleFace } from '../paddle-face';

type GameState = 'idle' | 'playing' | 'gameOver' | 'win';

const INITIAL_BALL_SPEED = 700;
const SPEED_MULTIPLIER = 1.02;
const BRICK_COLS = 10;
const BRICK_W = 80;
const BRICK_H = 28;
const BRICK_PAD = 8;
const BRICK_TOP_Y = 60;
const POINTS_PER_BRICK = 10;
const INITIAL_LIVES = 3;
const BALL_OFFSET_Y = 24;
const PADDLE_HALF_W = 60;
const MAX_BOUNCE_ANGLE = 60;
const ROW_TINTS = [
    0xff4455, 0xff6633, 0xff9922, 0xffcc11, 0x44dd44, 0x22ccaa, 0x4499ff, 0x6655ff, 0x9944ff,
    0xff44cc,
];
const HEART_SHAPE = [
    [0, 0, 1, 1, 0, 0, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
];
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

    private trail!: BallTrail;
    private face!: PaddleFace;
    private confettiEmitter!: GameObjects.Particles.ParticleEmitter;
    private bgFlash!: GameObjects.Rectangle;

    constructor() {
        super('Game');
    }

    create() {
        this.generateTextures();

        const { width, height } = this.scale;
        const centerX = width / 2;

        this.bgFlash = createBgFlash(this);
        this.trail = createBallTrail(this);

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

        this.confettiEmitter = createConfettiEmitter(this);
        this.face = createPaddleFace(this);

        // UI text (depth 10)
        this.scoreText = this.add
            .text(16, 16, 'Score: 0', { fontSize: '20px', color: '#ffffff' })
            .setDepth(10);
        this.livesText = this.add
            .text(width - 16, 16, `Lives: ${INITIAL_LIVES}`, { fontSize: '20px', color: '#ffffff' })
            .setOrigin(1, 0)
            .setDepth(10);
        this.messageText = this.add
            .text(centerX, height / 2, 'Click to Launch', {
                fontSize: '32px',
                color: '#ffffff',
                backgroundColor: 'rgba(0,0,0,0.75)',
                padding: { x: 16, y: 10 },
            })
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
        this.face.reset(this.time.now);
    }

    update() {
        if (this.state === 'idle') {
            this.ball.x = this.paddle.x;
            this.ball.y = this.paddle.y - BALL_OFFSET_Y;
        }

        if (this.state === 'playing') {
            const ballBody = this.ballBody;
            const speed = ballBody.speed;

            if (speed > 0) {
                this.ball.setRotation(Math.atan2(ballBody.velocity.y, ballBody.velocity.x));
                const ballStretch = Phaser.Math.Clamp(1 + speed * 0.0004, 1.0, 1.4);
                this.ball.setScale(ballStretch, 1 / ballStretch);
            }

            this.trail.record(this.ball.x, this.ball.y);
            this.trail.draw();
        }

        this.face.update(this.paddle, this.ball, this.state, this.time.now);
    }

    private get ballBody(): Physics.Arcade.Body {
        return this.ball.body as Physics.Arcade.Body;
    }

    private generateTextures() {
        if (this.textures.exists('paddle')) return;

        const g = this.add.graphics();
        const tex = (draw: () => void, key: string, w: number, h: number) => {
            g.fillStyle(0xffffff);
            draw();
            g.generateTexture(key, w, h);
            g.clear();
        };

        tex(
            () => g.fillRoundedRect(0, 0, PADDLE_HALF_W * 2, 20, 6),
            'paddle',
            PADDLE_HALF_W * 2,
            20,
        );
        tex(() => g.fillCircle(8, 8, 8), 'ball', 16, 16);
        tex(() => g.fillRoundedRect(0, 0, BRICK_W, BRICK_H, 4), 'brick', BRICK_W, BRICK_H);
        tex(() => g.fillCircle(2, 2, 2), 'particle', 4, 4);
        tex(() => g.fillCircle(3, 3, 3), 'spark', 6, 6);
        tex(() => g.fillRect(0, 0, 8, 4), 'shard', 8, 4);

        g.destroy();
    }

    private createBricks() {
        const totalW = BRICK_COLS * BRICK_W + (BRICK_COLS - 1) * BRICK_PAD;
        const startX = (this.scale.width - totalW) / 2 + BRICK_W / 2;

        for (let row = 0; row < HEART_SHAPE.length; row++) {
            for (let col = 0; col < BRICK_COLS; col++) {
                if (!HEART_SHAPE[row][col]) continue;
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
        this.trail.clear();
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
        this.trail.clear();
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

        ballImpactFx(this, this.ball, this.bgFlash, BALL_TINT, 0.03, 150);
        this.confettiEmitter.emitParticleAt(this.ball.x, this.paddle.y, 8);
        this.face.onPaddleHit(this.time.now);
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

        ballImpactFx(this, this.ball, this.bgFlash, BALL_TINT, 0.06, 200);

        if (this.bricks.countActive() === 0) {
            this.state = 'win';
            this.stopBall('You Win!\nClick to Restart');
            this.face.onWin();
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
            this.face.onGameOver();
        }
    }
}
