import Phaser, { GameObjects, Physics, Scene } from 'phaser';
import { emitBrickShards, emitImpactSparks } from '../particles';
import { createBallTrail, type BallTrail } from '../ball-trail';
import { ballImpactFx, createBgFlash, createConfettiEmitter } from '../visual-fx';
import { createPaddleFace, type PaddleFace } from '../paddle-face';
import { loadProgress, saveProgress } from '../persistence';

type GameState = 'idle' | 'playing' | 'gameOver' | 'win';

const INITIAL_BALL_SPEED = 700;
const SPEED_MULTIPLIER = 1.01;
const BRICK_COLS = 10;
const BRICK_W = 80;
const BRICK_H = 28;
const BRICK_PAD = 8;
const BRICK_TOP_Y = 60;
const POINTS_PER_BRICK = 10;
const BALL_OFFSET_Y = 24;
const MAX_BOUNCE_ANGLE = 60;
const BULLET_SPEED = 600;
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
    private livesText!: GameObjects.Text;
    private messageText!: GameObjects.Text;
    private coinText!: GameObjects.Text;
    private ammoText!: GameObjects.Text;
    private score = 0;
    private lives = 1;
    private ballSpeed = INITIAL_BALL_SPEED;

    private trail!: BallTrail;
    private face!: PaddleFace;
    private confettiEmitter!: GameObjects.Particles.ParticleEmitter;
    private bgFlash!: GameObjects.Rectangle;

    // Incremental stats
    private paddleHalfW = 60;
    private paddleHp = 3;
    private maxPaddleHp = 3;
    private coinsEarned = 0;
    private coinMultiplier = 1;
    private ammo = 0;
    private maxAmmo = 0;
    private paddleBroken = false;
    private hpBar!: GameObjects.Graphics;
    private bullets!: Physics.Arcade.Group;

    constructor() {
        super('Game');
    }

    create() {
        const up = loadProgress().upgrades;

        this.lives = 1 + up.extraLives;
        this.paddleHalfW = 40 + up.paddleWidth * 10;
        this.maxPaddleHp = 5 + up.paddleHp * 3;
        this.paddleHp = this.maxPaddleHp;
        this.maxAmmo = up.shooting * 4;
        this.ammo = this.maxAmmo;
        this.coinMultiplier = 1 + up.coinMultiplier * 0.5;
        this.coinsEarned = 0;

        this.generateTextures();

        const { width, height } = this.scale;
        const centerX = width / 2;

        this.bgFlash = createBgFlash(this);
        this.trail = createBallTrail(this);

        this.paddle = this.physics.add.image(centerX, height - 48, 'paddle');
        const paddleBody = this.paddle.body as Physics.Arcade.Body;
        paddleBody.setImmovable(true);
        paddleBody.setCollideWorldBounds(true);
        this.paddle.setDepth(4);
        this.updatePaddleTint();

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

        // HP bar
        this.hpBar = this.add.graphics().setDepth(10);

        // Bullets
        this.bullets = this.physics.add.group({ allowGravity: false });
        this.physics.add.collider(
            this.bullets,
            this.bricks,
            this.hitBrickWithBullet,
            undefined,
            this,
        );

        // UI text (depth 10)
        const dpr = window.devicePixelRatio;
        this.livesText = this.add
            .text(width - 16, 16, `Lives: ${this.lives}`, { fontSize: '20px', color: '#ffffff' })
            .setResolution(dpr)
            .setOrigin(1, 0)
            .setDepth(10);
        this.coinText = this.add
            .text(16, 16, 'Coins: 0', { fontSize: '20px', color: '#ffd700' })
            .setResolution(dpr)
            .setDepth(10);
        this.ammoText = this.add
            .text(16, 42, `Ammo: ${this.ammo}`, { fontSize: '16px', color: '#aaaaff' })
            .setResolution(dpr)
            .setDepth(10)
            .setVisible(this.maxAmmo > 0);
        this.messageText = this.add
            .text(centerX, height / 2, 'Click to Launch', {
                fontSize: '32px',
                color: '#ffffff',
                backgroundColor: 'rgba(0,0,0,0.75)',
                padding: { x: 16, y: 10 },
            })
            .setResolution(dpr)
            .setOrigin(0.5)
            .setDepth(10);

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.state !== 'idle' && this.state !== 'playing') return;
            this.paddle.x = Phaser.Math.Clamp(
                pointer.x,
                this.paddleHalfW,
                width - this.paddleHalfW,
            );
            if (this.state === 'idle') {
                this.ball.x = this.paddle.x;
            }
        });

        this.input.on('pointerdown', () => {
            if (this.state === 'idle') {
                this.launchBall();
            } else if (this.state === 'playing' && this.ammo > 0) {
                this.fireBullet();
            }
        });

        this.score = 0;
        this.ballSpeed = INITIAL_BALL_SPEED;
        this.state = 'idle';
        this.paddleBroken = false;
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

            // Clean up bullets that left world bounds
            this.bullets.children.each((b) => {
                const bullet = b as Physics.Arcade.Image;
                if (bullet.y < -10) bullet.destroy();
                return true;
            });
        }

        this.drawHpBar();
        if (!this.paddleBroken) {
            this.face.update(this.paddle, this.ball, this.state, this.time.now);
        }
    }

    private get ballBody(): Physics.Arcade.Body {
        return this.ball.body as Physics.Arcade.Body;
    }

    private generateTextures() {
        // Remove old paddle texture so we can regenerate at new width
        if (this.textures.exists('paddle')) {
            this.textures.remove('paddle');
        }

        const g = this.add.graphics();
        const tex = (draw: () => void, key: string, w: number, h: number) => {
            g.fillStyle(0xffffff);
            draw();
            g.generateTexture(key, w, h);
            g.clear();
        };

        const paddleW = this.paddleHalfW * 2;
        tex(() => g.fillRoundedRect(0, 0, paddleW, 20, 6), 'paddle', paddleW, 20);

        if (!this.textures.exists('ball')) {
            tex(() => g.fillCircle(8, 8, 8), 'ball', 16, 16);
            tex(() => g.fillRoundedRect(0, 0, BRICK_W, BRICK_H, 4), 'brick', BRICK_W, BRICK_H);
            tex(() => g.fillCircle(2, 2, 2), 'particle', 4, 4);
            tex(() => g.fillCircle(3, 3, 3), 'spark', 6, 6);
            tex(() => g.fillRect(0, 0, 8, 4), 'shard', 8, 4);
            tex(() => g.fillRect(0, 0, 4, 12), 'bullet', 4, 12);
        }

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
                const delay = row * 40 + col * 15 + Phaser.Math.Between(0, 20);
                this.tweens.add({
                    targets: brick,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0,
                    ease: 'Back.Out',
                    duration: 150,
                    delay,
                });
            }
        }
    }

    private drawHpBar() {
        this.hpBar.clear();
        if (this.paddleBroken) return;
        if (this.maxPaddleHp <= 0) return;

        const ratio = this.paddleHp / this.maxPaddleHp;
        const barW = this.paddleHalfW * 2 - 8;
        const barH = 4;
        const x = this.paddle.x - barW / 2;
        const y = this.paddle.y + 14;

        // Background
        this.hpBar.fillStyle(0x333333, 0.8);
        this.hpBar.fillRect(x, y, barW, barH);

        // Fill color: green > 66%, yellow > 33%, red <= 33%
        let color = 0x44dd44;
        if (ratio <= 0.33) color = 0xff4444;
        else if (ratio <= 0.66) color = 0xffcc11;

        this.hpBar.fillStyle(color, 1);
        this.hpBar.fillRect(x, y, barW * ratio, barH);
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
        this.paddleHp = this.maxPaddleHp;
        this.updatePaddleTint();

        this.paddleBroken = false;
        this.paddle.setVisible(true);
        (this.paddle.body as Physics.Arcade.Body).enable = true;
        this.face.gfx.setVisible(true);
        this.hpBar.setVisible(true);
    }

    private updatePaddleTint() {
        const ratio = this.paddleHp / this.maxPaddleHp;
        const r = Phaser.Math.Linear(0xff, 0x00, ratio);
        const g = Phaser.Math.Linear(0x44, 0xe5, ratio);
        const b = Phaser.Math.Linear(0x44, 0xff, ratio);
        this.paddle.setTint(Phaser.Display.Color.GetColor(r, g, b));
    }

    private launchBall() {
        const angle = Phaser.Math.Between(-MAX_BOUNCE_ANGLE, MAX_BOUNCE_ANGLE);
        const rad = Phaser.Math.DegToRad(angle - 90);
        this.ballBody.setVelocity(Math.cos(rad) * this.ballSpeed, Math.sin(rad) * this.ballSpeed);
        this.state = 'playing';
        this.messageText.setVisible(false);
    }

    private stopBall() {
        this.ballBody.setVelocity(0);
        this.trail.clear();
    }

    private fireBullet() {
        const bullet = this.bullets.create(
            this.paddle.x,
            this.paddle.y - 16,
            'bullet',
        ) as Physics.Arcade.Image;
        bullet.setTint(0xaaaaff);
        bullet.setDepth(3);
        (bullet.body as Physics.Arcade.Body).setVelocity(0, -BULLET_SPEED);
        this.ammo--;
        this.ammoText.setText(`Ammo: ${this.ammo}`);
    }

    private destroyBrick(brick: Physics.Arcade.Image) {
        const bx = brick.x;
        const by = brick.y;
        const tint = brick.tintTopLeft;
        brick.destroy();

        emitImpactSparks(this, bx, by, tint);
        emitBrickShards(this, bx, by, tint);

        this.score += POINTS_PER_BRICK;

        const coins = Math.floor(POINTS_PER_BRICK * this.coinMultiplier);
        this.coinsEarned += coins;
        this.coinText.setText(`Coins: ${this.coinsEarned}`);

        // Floating coin text
        const coinFloat = this.add
            .text(bx, by, `+${coins}`, { fontSize: '14px', color: '#ffd700' })
            .setResolution(window.devicePixelRatio)
            .setOrigin(0.5)
            .setDepth(10);
        this.tweens.add({
            targets: coinFloat,
            y: by - 30,
            alpha: 0,
            duration: 600,
            ease: 'Cubic.Out',
            onComplete: () => coinFloat.destroy(),
        });

        if (this.bricks.countActive() === 0) {
            this.state = 'win';
            this.stopBall();
            this.face.onWin();
            this.showEndScreen();
        }
    }

    private breakPaddle() {
        emitBrickShards(this, this.paddle.x, this.paddle.y, PADDLE_TINT);
        emitImpactSparks(this, this.paddle.x, this.paddle.y, PADDLE_TINT);

        this.paddle.setVisible(false);
        (this.paddle.body as Physics.Arcade.Body).enable = false;
        this.face.gfx.setVisible(false);
        this.hpBar.setVisible(false);
        this.paddleBroken = true;
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

        // Paddle HP damage
        this.paddleHp--;
        this.updatePaddleTint();

        if (this.paddleHp <= 0) {
            this.breakPaddle();
            return;
        }

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

        this.destroyBrick(brick);

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
    }

    private hitBrickWithBullet(
        _bullet: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
        _brick: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    ) {
        if (this.state !== 'playing') return;
        const bullet = _bullet as Physics.Arcade.Image;
        const brick = _brick as Physics.Arcade.Image;
        bullet.destroy();
        this.destroyBrick(brick);
    }

    private loseLife() {
        this.lives--;
        this.livesText.setText(`Lives: ${this.lives}`);

        if (this.lives > 0) {
            this.resetBall();
        } else {
            this.state = 'gameOver';
            this.stopBall();
            this.face.onGameOver();
            this.showEndScreen();
        }
    }

    private showEndScreen() {
        const progress = loadProgress();
        progress.coins += this.coinsEarned;
        saveProgress(progress);

        const { width, height } = this.scale;
        const cx = width / 2;
        const cy = height / 2;

        this.messageText.setVisible(false);

        const row1Y = cy - 22;
        const row2Y = cy + 22;
        const gap = 12;

        const dpr = window.devicePixelRatio;
        const l1 = this.add
            .text(0, row1Y, 'Coins Earned:', { fontSize: '26px', color: '#ffd700' })
            .setResolution(dpr)
            .setOrigin(0, 0.5)
            .setDepth(11);
        const l2 = this.add
            .text(0, row2Y, 'Total Coins:', { fontSize: '26px', color: '#44dd44' })
            .setResolution(dpr)
            .setOrigin(0, 0.5)
            .setDepth(11);

        const numStartX = Math.max(l1.width, l2.width) + gap;
        const n1 = this.add
            .text(numStartX, row1Y, `${this.coinsEarned}`, {
                fontSize: '36px',
                color: '#ffd700',
                fontStyle: 'bold',
            })
            .setResolution(dpr)
            .setOrigin(0, 0.5)
            .setDepth(11);
        const n2 = this.add
            .text(numStartX, row2Y, `${progress.coins}`, {
                fontSize: '36px',
                color: '#44dd44',
                fontStyle: 'bold',
            })
            .setResolution(dpr)
            .setOrigin(0, 0.5)
            .setDepth(11);

        const totalW = numStartX + Math.max(n1.width, n2.width);
        const offsetX = cx - totalW / 2;
        for (const t of [l1, l2, n1, n2]) t.x += offsetX;

        const pad = 20;
        this.add.rectangle(cx, cy, totalW + pad * 2, 110, 0x000000, 0.75).setDepth(10);

        const btnStyle = {
            fontSize: '24px',
            color: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.75)',
            padding: { x: 20, y: 12 },
        };

        this.add
            .text(cx - 100, cy + 100, 'Play Again', btnStyle)
            .setResolution(dpr)
            .setOrigin(0.5)
            .setDepth(10)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.scene.restart());

        this.add
            .text(cx + 100, cy + 100, 'Upgrades', btnStyle)
            .setResolution(dpr)
            .setOrigin(0.5)
            .setDepth(10)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.scene.start('Upgrade'));
    }
}
