import Phaser, { GameObjects, Physics, Scene } from 'phaser';
import { emitBrickShards, emitExplosion, emitImpactSparks } from '../particles';
import { createBallTrail, type BallTrail } from '../ball-trail';
import { ballImpactFx, createBgFlash, createConfettiEmitter } from '../visual-fx';
import { createPaddleFace, type PaddleFace } from '../paddle-face';
import { loadProgress, saveProgress } from '../persistence';
import { FONT_FAMILY, drawPanel } from '../ui-utils';

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
const BOMB_INITIAL_SPEED = 180;
const BOMB_ACCEL = 1400;
const ROW_TINTS = [
    0xff4455, 0xff6633, 0xff9922, 0xffcc11, 0x44dd44, 0x22ccaa, 0x4499ff, 0x6655ff, 0x9944ff,
    0xff44cc, 0xff4455, 0xff6633,
];
const LEVEL_SHAPES = [
    // Level 1: Heart
    [
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
    ],
    // Level 2: Space Invader (80 bricks)
    [
        [0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 1, 0, 0, 1, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 0, 1, 1, 0, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 0, 1, 1, 0, 1, 0, 1],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 0, 0, 1, 1, 0, 0],
        [0, 1, 1, 0, 0, 0, 0, 1, 1, 0],
    ],
    // Level 3: Skull (90 bricks)
    [
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 0, 0, 1, 1, 0, 0, 1, 1],
        [1, 1, 0, 0, 1, 1, 0, 0, 1, 1],
        [1, 1, 1, 1, 0, 0, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 0, 0, 1, 1, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 0, 1, 1, 0, 1, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
    ],
];
const MAX_LEVEL = LEVEL_SHAPES.length;
const BALL_TINT = 0xffeb3b;
const PADDLE_TINT = 0x00e5ff;

export class Game extends Scene {
    private state: GameState = 'idle';
    private paddle!: Physics.Arcade.Image;
    private ball!: Physics.Arcade.Image;
    private bricks!: Physics.Arcade.StaticGroup;
    private livesText!: GameObjects.Text;
    private messageText!: GameObjects.Text;
    private messageBg!: GameObjects.Graphics;
    private coinText!: GameObjects.Text;
    private ammoText!: GameObjects.Text;
    private levelText!: GameObjects.Text;
    private level = 1;
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
    private bombs = 0;
    private maxBombs = 0;
    private bombRadius = 0;
    private bombsGroup!: Physics.Arcade.Group;
    private bombText!: GameObjects.Text;

    constructor() {
        super('Game');
    }

    create(data?: { level?: number }) {
        this.level = data?.level ?? 1;
        const up = loadProgress().upgrades;

        this.lives = 1 + up.extraLives;
        this.paddleHalfW = 40 + up.paddleWidth * 10;
        this.maxPaddleHp = 5 + up.paddleHp * 3;
        this.paddleHp = this.maxPaddleHp;
        this.maxAmmo = up.shooting * 4;
        this.ammo = this.maxAmmo;
        this.coinMultiplier = 1 + up.coinMultiplier * 0.5;
        const missileLevel = up.missile;
        this.maxBombs = missileLevel > 0 ? 3 : 0;
        this.bombRadius = missileLevel > 0 ? 80 + missileLevel * 20 : 0;
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

        // Bombs
        this.bombs = this.maxBombs;
        this.bombsGroup = this.physics.add.group({ allowGravity: false });
        this.physics.add.collider(
            this.bombsGroup,
            this.bricks,
            this.hitBrickWithBomb,
            undefined,
            this,
        );
        this.input.mouse?.disableContextMenu();

        // UI text (depth 10)
        const dpr = window.devicePixelRatio;
        this.livesText = this.add
            .text(width - 16, 16, `Lives: ${this.lives}`, {
                fontFamily: FONT_FAMILY,
                fontSize: '20px',
                color: '#ffffff',
            })
            .setResolution(dpr)
            .setOrigin(1, 0)
            .setDepth(10);
        this.coinText = this.add
            .text(16, 16, 'Coin: 0', {
                fontFamily: FONT_FAMILY,
                fontSize: '20px',
                color: '#ffd700',
            })
            .setResolution(dpr)
            .setDepth(10);
        this.ammoText = this.add
            .text(16, 42, `Ammo: ${this.ammo}`, {
                fontFamily: FONT_FAMILY,
                fontSize: '16px',
                color: '#aaaaff',
            })
            .setResolution(dpr)
            .setDepth(10)
            .setVisible(this.maxAmmo > 0);
        this.bombText = this.add
            .text(16, 64, `Bomb: ${this.bombs}`, {
                fontFamily: FONT_FAMILY,
                fontSize: '16px',
                color: '#ff6633',
            })
            .setResolution(dpr)
            .setDepth(10)
            .setVisible(this.maxBombs > 0);
        this.messageBg = this.add.graphics().setDepth(9);
        this.messageText = this.add
            .text(centerX, height / 2, 'Click to Launch', {
                fontFamily: FONT_FAMILY,
                fontSize: '32px',
                color: '#ffffff',
            })
            .setResolution(dpr)
            .setOrigin(0.5)
            .setDepth(10);

        this.levelText = this.add
            .text(centerX, 16, `Level ${this.level}`, {
                fontFamily: FONT_FAMILY,
                fontSize: '20px',
                color: '#ffffff',
            })
            .setResolution(dpr)
            .setOrigin(0.5, 0)
            .setDepth(10);
        this.drawMessageBg();

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

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.state === 'idle') {
                this.launchBall();
            } else if (this.state === 'playing') {
                if (pointer.rightButtonDown()) {
                    if (this.bombs > 0) this.throwBomb();
                } else if (this.ammo > 0) {
                    this.fireBullet();
                }
            }
        });

        this.score = 0;
        this.ballSpeed = INITIAL_BALL_SPEED;
        this.state = 'idle';
        this.paddleBroken = false;
        this.face.reset(this.time.now);

        const devInput = document.getElementById('dev-level') as HTMLInputElement | null;
        if (devInput) {
            const handler = (e: KeyboardEvent) => {
                if (e.key !== 'Enter') return;
                const num = parseInt(devInput.value, 10);
                if (num >= 1 && num <= MAX_LEVEL) this.jumpToLevel(num);
            };
            devInput.addEventListener('keydown', handler);
            this.events.once('shutdown', () => devInput.removeEventListener('keydown', handler));
        }
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

            // Clean up bombs that left world bounds
            this.bombsGroup.children.each((b) => {
                const bomb = b as Physics.Arcade.Image;
                if (bomb.y < -10) bomb.destroy();
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
            tex(
                () => {
                    const cx = 12;
                    // Ogive nose cone
                    g.fillStyle(0xeeeeee);
                    g.fillTriangle(cx, 0, cx - 5, 18, cx + 5, 18);
                    // Nose tip highlight
                    g.fillStyle(0xffffff);
                    g.fillTriangle(cx, 0, cx - 2, 14, cx, 14);
                    // Seeker dome
                    g.fillStyle(0x999999);
                    g.fillRect(cx - 5, 18, 10, 2);
                    // Body
                    g.fillStyle(0xdddddd);
                    g.fillRect(cx - 5, 20, 10, 28);
                    // Body left highlight
                    g.fillStyle(0xffffff, 0.4);
                    g.fillRect(cx - 5, 20, 3, 28);
                    // Body right shadow
                    g.fillStyle(0xaaaaaa, 0.4);
                    g.fillRect(cx + 2, 20, 3, 28);
                    // Warhead band
                    g.fillStyle(0xffffff);
                    g.fillRect(cx - 5, 23, 10, 2);
                    // Mid marking
                    g.fillStyle(0xbbbbbb);
                    g.fillRect(cx - 5, 32, 10, 1);
                    g.fillRect(cx - 5, 35, 10, 1);
                    // Canard wings
                    g.fillStyle(0xcccccc);
                    g.fillTriangle(cx - 5, 26, cx - 12, 34, cx - 5, 32);
                    g.fillTriangle(cx + 5, 26, cx + 12, 34, cx + 5, 32);
                    // Main tail fins (large, swept)
                    g.fillStyle(0xaaaaaa);
                    g.fillTriangle(cx - 5, 40, cx - 12, 52, cx - 5, 48);
                    g.fillTriangle(cx + 5, 40, cx + 12, 52, cx + 5, 48);
                    // Nozzle
                    g.fillStyle(0x888888);
                    g.fillRect(cx - 3, 48, 6, 4);
                    // Exhaust core
                    g.fillStyle(0xffffff);
                    g.fillCircle(cx, 54, 3);
                    g.fillStyle(0xffffff, 0.4);
                    g.fillCircle(cx, 56, 5);
                },
                'bomb',
                24,
                60,
            );
        }

        g.destroy();
    }

    private drawMessageBg() {
        this.messageBg.clear().setVisible(true);
        const padX = 24;
        const padY = 14;
        const w = this.messageText.width + padX * 2;
        const h = this.messageText.height + padY * 2;
        drawPanel(this.messageBg, this.messageText.x - w / 2, this.messageText.y - h / 2, w, h);
    }

    private createBricks() {
        const totalW = BRICK_COLS * BRICK_W + (BRICK_COLS - 1) * BRICK_PAD;
        const startX = (this.scale.width - totalW) / 2 + BRICK_W / 2;

        const shape = LEVEL_SHAPES[this.level - 1];
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < BRICK_COLS; col++) {
                if (!shape[row][col]) continue;
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
        this.levelText.setText(`Level ${this.level}`);
        this.drawMessageBg();
        this.trail.clear();
        this.ball.setScale(1);
        this.ball.setRotation(0);
        this.ball.setTint(BALL_TINT);
        this.paddleHp = this.maxPaddleHp;
        this.updatePaddleTint();
        this.bombs = this.maxBombs;
        this.bombText.setText(`Bomb: ${this.bombs}`);

        this.paddleBroken = false;
        this.paddle.setVisible(true);
        (this.paddle.body as Physics.Arcade.Body).enable = true;
        this.face.gfx.setVisible(true);
        this.hpBar.setVisible(true);
    }

    private advanceLevel() {
        this.jumpToLevel(this.level + 1);
    }

    private jumpToLevel(level: number) {
        this.level = level;
        this.bricks.clear(true, true);
        this.createBricks();
        this.bricks.refresh();
        this.resetBall();
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
        this.messageBg.setVisible(false);
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

    private throwBomb() {
        const bomb = this.bombsGroup.create(
            this.paddle.x,
            this.paddle.y - 16,
            'bomb',
        ) as Physics.Arcade.Image;
        bomb.setTint(0xff6633);
        bomb.setDepth(3);
        const body = bomb.body as Physics.Arcade.Body;
        body.setVelocity(0, -BOMB_INITIAL_SPEED);
        body.setAccelerationY(-BOMB_ACCEL);
        this.bombs--;
        this.bombText.setText(`Bomb: ${this.bombs}`);
    }

    private hitBrickWithBomb(
        _bomb: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
        _brick: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    ) {
        if (this.state !== 'playing') return;
        const bomb = _bomb as Physics.Arcade.Image;
        const brick = _brick as Physics.Arcade.Image;
        const cx = brick.x;
        const cy = brick.y;
        bomb.destroy();

        const toDestroy: Physics.Arcade.Image[] = [];
        this.bricks.children.each((b) => {
            const br = b as Physics.Arcade.Image;
            if (!br.active) return true;
            const dist = Phaser.Math.Distance.Between(cx, cy, br.x, br.y);
            if (dist < this.bombRadius) toDestroy.push(br);
            return true;
        });

        for (const br of toDestroy) {
            this.destroyBrick(br);
        }

        emitExplosion(this, cx, cy);
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
        this.coinText.setText(`Coin: ${this.coinsEarned}`);

        // Floating coin text
        const coinFloat = this.add
            .text(bx, by, `+${coins}`, {
                fontFamily: FONT_FAMILY,
                fontSize: '14px',
                color: '#ffd700',
            })
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
            if (this.level < MAX_LEVEL) {
                this.advanceLevel();
            } else {
                this.state = 'win';
                this.stopBall();
                this.face.onWin();
                this.showEndScreen();
            }
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
        this.messageBg.setVisible(false);

        const row1Y = cy - 22;
        const row2Y = cy + 22;
        const gap = 12;

        const dpr = window.devicePixelRatio;
        const l1 = this.add
            .text(0, row1Y, 'Coin Earned:', {
                fontFamily: FONT_FAMILY,
                fontSize: '26px',
                color: '#ffd700',
            })
            .setResolution(dpr)
            .setOrigin(0, 0.5)
            .setDepth(11);
        const l2 = this.add
            .text(0, row2Y, 'Total Coin:', {
                fontFamily: FONT_FAMILY,
                fontSize: '26px',
                color: '#44dd44',
            })
            .setResolution(dpr)
            .setOrigin(0, 0.5)
            .setDepth(11);

        const numStartX = Math.max(l1.width, l2.width) + gap;
        const n1 = this.add
            .text(numStartX, row1Y, `${this.coinsEarned}`, {
                fontFamily: FONT_FAMILY,
                fontSize: '36px',
                color: '#ffd700',
                fontStyle: 'bold',
            })
            .setResolution(dpr)
            .setOrigin(0, 0.5)
            .setDepth(11);
        const n2 = this.add
            .text(numStartX, row2Y, `${progress.coins}`, {
                fontFamily: FONT_FAMILY,
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
        const panelW = totalW + pad * 2;
        const panelH = 110;
        const panelBg = this.add.graphics();
        drawPanel(panelBg, cx - panelW / 2, cy - panelH / 2, panelW, panelH);
        panelBg.setDepth(10);

        const createEndBtn = (bx: number, label: string, onClick: () => void) => {
            const txt = this.add
                .text(bx, cy + 100, label, {
                    fontFamily: FONT_FAMILY,
                    fontSize: '24px',
                    color: '#ffffff',
                })
                .setResolution(dpr)
                .setOrigin(0.5)
                .setDepth(11);
            const bw = txt.width + 40;
            const bh = txt.height + 24;
            const bx0 = bx - bw / 2;
            const by0 = cy + 100 - bh / 2;
            const bg = this.add.graphics();
            drawPanel(bg, bx0, by0, bw, bh, 10);
            bg.setDepth(10);
            const hit = this.add.rectangle(bx, cy + 100, bw, bh, 0x000000, 0).setDepth(12);
            hit.setInteractive({ useHandCursor: true });
            hit.on('pointerover', () => {
                bg.clear();
                drawPanel(bg, bx0, by0, bw, bh, 10, 0x3a3a5a, 0.95, 0x6a6a8a);
            });
            hit.on('pointerout', () => {
                bg.clear();
                drawPanel(bg, bx0, by0, bw, bh, 10);
            });
            hit.on('pointerdown', onClick);
        };

        createEndBtn(cx - 100, 'Play Again', () =>
            this.scene.restart(this.state === 'gameOver' ? { level: this.level } : undefined),
        );
        createEndBtn(cx + 100, 'Upgrades', () => this.scene.start('Upgrade'));
    }
}
