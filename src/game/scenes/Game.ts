import { GameObjects, Physics, Scene } from 'phaser';

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

    constructor() {
        super('Game');
    }

    create() {
        this.generateTextures();

        const { width, height } = this.scale;
        const centerX = width / 2;

        this.paddle = this.physics.add.image(centerX, height - 48, 'paddle');
        const paddleBody = this.paddle.body as Physics.Arcade.Body;
        paddleBody.setImmovable(true);
        paddleBody.setCollideWorldBounds(true);

        this.ball = this.physics.add.image(centerX, height - 48 - BALL_OFFSET_Y, 'ball');
        const ballBody = this.ball.body as Physics.Arcade.Body;
        ballBody.setBounce(1);
        ballBody.setCollideWorldBounds(true);
        ballBody.onWorldBounds = true;

        this.bricks = this.physics.add.staticGroup();
        this.createBricks();

        this.physics.add.collider(this.ball, this.paddle, this.hitPaddle, undefined, this);
        this.physics.add.collider(this.ball, this.bricks, this.hitBrick, undefined, this);

        this.physics.world.on(
            'worldbounds',
            (_body: Physics.Arcade.Body, _up: boolean, down: boolean) => {
                if (down) this.loseLife();
            },
        );

        this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '20px', color: '#ffffff' });
        this.livesText = this.add
            .text(width - 16, 16, 'Lives: 3', { fontSize: '20px', color: '#ffffff' })
            .setOrigin(1, 0);
        this.messageText = this.add
            .text(centerX, height / 2, 'Click to Launch', { fontSize: '32px', color: '#ffffff' })
            .setOrigin(0.5);

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
    }

    update() {
        if (this.state === 'idle') {
            this.ball.x = this.paddle.x;
            this.ball.y = this.paddle.y - BALL_OFFSET_Y;
        }
    }

    private get ballBody(): Physics.Arcade.Body {
        return this.ball.body as Physics.Arcade.Body;
    }

    private generateTextures() {
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
            }
        }
    }

    private resetBall() {
        this.ball.setPosition(this.paddle.x, this.paddle.y - BALL_OFFSET_Y);
        this.ballBody.setVelocity(0);
        this.ballSpeed = INITIAL_BALL_SPEED;
        this.state = 'idle';
        this.messageText.setText('Click to Launch').setVisible(true);
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
    }

    private hitPaddle(
        _ball: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    ) {
        const ball = _ball as Physics.Arcade.Image;
        const diff = ball.x - this.paddle.x;
        const angle = Phaser.Math.Clamp(diff, -MAX_BOUNCE_ANGLE, MAX_BOUNCE_ANGLE);
        const rad = Phaser.Math.DegToRad(angle - 90);
        const speed = this.ballBody.speed || this.ballSpeed;
        this.ballBody.setVelocity(Math.cos(rad) * speed, Math.sin(rad) * speed);
    }

    private hitBrick(
        _ball: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
        _brick: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    ) {
        (_brick as Physics.Arcade.Image).destroy();

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

        if (this.bricks.countActive() === 0) {
            this.state = 'win';
            this.stopBall('You Win!\nClick to Restart');
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
        }
    }
}
