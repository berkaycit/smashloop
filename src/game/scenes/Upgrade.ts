import { Scene } from 'phaser';
import { loadProgress, saveProgress } from '../persistence';
import { FONT_FAMILY, drawPanel, upgradeLevel } from '../ui-utils';
import { UPGRADES, upgradeCost } from '../upgrades';
import type { UpgradeDef } from '../upgrades';
import type { GameProgress } from '../persistence';
import {
    getNodeState,
    stateColor,
    drawNodeBg,
    drawProgressRing,
    drawConnections,
    createNodeContainer,
    NODE_RADIUS,
} from '../skill-tree-render';
import type { NodeState } from '../skill-tree-render';

const HOVER_BORDER = 0x60a5fa;

export class Upgrade extends Scene {
    constructor() {
        super('Upgrade');
    }

    create() {
        const { width, height } = this.scale;
        const progress = loadProgress();
        const dpr = window.devicePixelRatio;

        this.generateIcons();
        this.generateSparkTexture();
        this.drawBackground(width, height);

        // Header: coin panel
        const coinPanelBg = this.add.graphics();
        drawPanel(coinPanelBg, 12, 12, 180, 40, 8);
        coinPanelBg.setDepth(5);

        this.add.image(32, 32, 'icon-coin').setDepth(5);
        this.add
            .text(50, 32, `${progress.coins}`, {
                fontFamily: FONT_FAMILY,
                fontSize: '20px',
                color: '#ffcc11',
                fontStyle: 'bold',
            })
            .setResolution(dpr)
            .setOrigin(0, 0.5)
            .setDepth(5);

        // Back button (styled panel)
        this.createBackButton(width - 80, 32, () => {
            this.scene.start('Game');
        });

        // Connections (depth 1)
        const connG = this.add.graphics();
        connG.setDepth(1);
        drawConnections(connG, UPGRADES, (key) => upgradeLevel(progress, key));

        // Nodes (depth 2)
        for (const def of UPGRADES) {
            const level = upgradeLevel(progress, def.key);
            const prereqsMet = def.prerequisites.every((k) => upgradeLevel(progress, k) >= 1);
            const state = getNodeState(level, def.maxLevel, prereqsMet);
            const container = createNodeContainer(this, def, level, state, progress.coins);
            this.setupInteraction(container, def, progress, state);
            this.applyStateAnimation(container, state);
        }
    }

    private drawBackground(width: number, height: number) {
        const bg = this.add.graphics();
        bg.setDepth(0);

        // Radial vignette: concentric circles from lighter center to darker edges
        const cx = width / 2;
        const cy = height / 2;
        const maxR = Math.sqrt(cx * cx + cy * cy);
        const steps = 20;
        // Fill the outermost area
        bg.fillStyle(0x141428, 1);
        bg.fillRect(0, 0, width, height);

        // Draw vignette on top of the base fill
        for (let i = steps; i >= 0; i--) {
            const t = i / steps;
            const rg = Math.round(0x14 + (0x2a - 0x14) * (1 - t));
            const b = Math.round(0x28 + (0x50 - 0x28) * (1 - t));
            bg.fillStyle((rg << 16) | (rg << 8) | b, 1);
            bg.fillCircle(cx, cy, maxR * t);
        }

        // Faint grid
        bg.lineStyle(1, 0x3a3a60, 0.18);
        for (let x = 0; x < width; x += 64) {
            bg.lineBetween(x, 0, x, height);
        }
        for (let y = 0; y < height; y += 64) {
            bg.lineBetween(0, y, width, y);
        }
    }

    private applyStateAnimation(container: Phaser.GameObjects.Container, state: NodeState) {
        if (state === 'available') {
            this.tweens.add({
                targets: container,
                scaleX: 1.04,
                scaleY: 1.04,
                duration: 800,
                ease: 'Sine.InOut',
                yoyo: true,
                repeat: -1,
            });
        } else if (state === 'maxed') {
            // Golden shimmer on the ring graphics
            const ring = container.getByName('ring') as Phaser.GameObjects.Graphics | null;
            if (ring) {
                this.tweens.add({
                    targets: ring,
                    alpha: { from: 0.3, to: 1.0 },
                    duration: 1200,
                    ease: 'Sine.InOut',
                    yoyo: true,
                    repeat: -1,
                });
            }
        } else if (state === 'locked') {
            container.setAlpha(0.5);
        }
    }

    private setupInteraction(
        container: Phaser.GameObjects.Container,
        def: UpgradeDef,
        progress: GameProgress,
        state: NodeState,
    ) {
        const hitArea = this.add.rectangle(0, 0, 96, 96, 0x000000, 0);
        container.add(hitArea);
        hitArea.setInteractive({ useHandCursor: state === 'available' || state === 'unlocked' });

        let tooltipContainer: Phaser.GameObjects.Container | null = null;

        hitArea.on('pointerover', () => {
            const bg = container.getByName('bg') as Phaser.GameObjects.Graphics;
            if (bg) drawNodeBg(bg, HOVER_BORDER, 3);
            tooltipContainer = this.createTooltip(def, progress, state);
        });

        hitArea.on('pointerout', () => {
            const bg = container.getByName('bg') as Phaser.GameObjects.Graphics;
            const color = stateColor(
                getNodeState(upgradeLevel(progress, def.key), def.maxLevel, true),
            );
            if (bg) drawNodeBg(bg, color);

            if (tooltipContainer) {
                tooltipContainer.destroy(true);
                tooltipContainer = null;
            }
        });

        hitArea.on('pointerdown', () => {
            if (state === 'locked' || state === 'maxed') return;
            this.purchase(def, container);
        });
    }

    private createTooltip(
        def: UpgradeDef,
        progress: GameProgress,
        state: NodeState,
    ): Phaser.GameObjects.Container {
        const dpr = window.devicePixelRatio;
        const level = upgradeLevel(progress, def.key);
        const isMaxed = level >= def.maxLevel;
        const cost = isMaxed ? 0 : upgradeCost(def, level);
        const canAfford =
            !isMaxed && (state === 'available' || state === 'unlocked') && progress.coins >= cost;

        const costLabel = isMaxed ? 'MAXED' : `Cost: ${cost}`;
        const costColor = isMaxed ? '#f59e0b' : canAfford ? '#22c55e' : '#ef4444';

        const lines: { text: string; size: string; color: string; bold?: boolean }[] = [
            { text: def.name, size: '16px', color: '#ffffff', bold: true },
            { text: def.description, size: '13px', color: '#8888bb' },
            { text: def.effectLabel(level), size: '14px', color: '#66ddff' },
            { text: costLabel, size: '14px', color: costColor },
        ];

        const gap = 4;
        const sepGap = 6;
        const textObjects: Phaser.GameObjects.Text[] = [];
        let curY = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (i === 1) curY += sepGap; // extra gap after title separator
            const t = this.add
                .text(0, curY, line.text, {
                    fontFamily: FONT_FAMILY,
                    fontSize: line.size,
                    color: line.color,
                    fontStyle: line.bold ? 'bold' : undefined,
                })
                .setResolution(dpr)
                .setOrigin(0.5, 0);
            textObjects.push(t);
            curY += t.height + gap;
        }

        const sepY = textObjects[0].height + gap;
        const totalHeight = curY - gap;
        const maxW = Math.max(...textObjects.map((t) => t.width));

        const padX = 14;
        const padY = 10;
        const tooltipBg = this.add.graphics();
        drawPanel(
            tooltipBg,
            -maxW / 2 - padX,
            -padY,
            maxW + padX * 2,
            totalHeight + padY * 2,
            8,
            undefined,
            0.95,
        );
        tooltipBg.lineStyle(1, 0x4a4a6a, 0.6);
        tooltipBg.lineBetween(-maxW / 2, sepY, maxW / 2, sepY);

        const aboveNode = def.y > this.scale.height / 2;
        const tooltipY = aboveNode
            ? def.y - NODE_RADIUS - 24 - totalHeight - padY
            : def.y + NODE_RADIUS + 24;

        const container = this.add.container(def.x, tooltipY, [tooltipBg, ...textObjects]);
        container.setDepth(10);
        return container;
    }

    private purchase(def: UpgradeDef, container: Phaser.GameObjects.Container) {
        const p = loadProgress();
        const level = upgradeLevel(p, def.key);
        const cost = upgradeCost(def, level);

        if (p.coins < cost || level >= def.maxLevel) return;

        p.coins -= cost;
        (p.upgrades as Record<string, number>)[def.key]++;
        saveProgress(p);

        // Particle burst
        this.spawnPurchaseParticles(def.x, def.y);

        // Animate progress ring from old fraction to new fraction
        const ring = container.getByName('ring') as Phaser.GameObjects.Graphics | null;
        const oldFraction = level / def.maxLevel;
        const newFraction = (level + 1) / def.maxLevel;
        const newState = getNodeState(level + 1, def.maxLevel, true);
        const color = stateColor(newState);
        const tweenTarget = { value: oldFraction };

        this.tweens.add({
            targets: container,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 75,
            yoyo: true,
        });

        this.tweens.add({
            targets: tweenTarget,
            value: newFraction,
            duration: 400,
            ease: 'Cubic.Out',
            onUpdate: () => {
                if (ring) drawProgressRing(ring, tweenTarget.value, color);
            },
            onComplete: () => this.scene.restart(),
        });
    }

    private spawnPurchaseParticles(x: number, y: number) {
        const emitter = this.add.particles(x, y, 'spark', {
            speed: { min: 80, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            lifespan: 500,
            quantity: 12,
            emitting: false,
            tint: [0xf59e0b, 0xffcc11, 0x22c55e],
        });
        emitter.setDepth(15);
        emitter.explode(12);

        this.time.delayedCall(500, () => emitter.destroy());
    }

    private createBackButton(x: number, y: number, onClick: () => void) {
        const btnW = 120;
        const btnH = 36;
        const btnBg = this.add.graphics();
        drawPanel(btnBg, x - btnW / 2, y - btnH / 2, btnW, btnH, 8);
        btnBg.setDepth(5);

        this.add
            .text(x, y, 'BACK', {
                fontFamily: FONT_FAMILY,
                fontSize: '18px',
                color: '#ffffff',
                fontStyle: 'bold',
            })
            .setResolution(window.devicePixelRatio)
            .setOrigin(0.5)
            .setDepth(5);

        const hitArea = this.add
            .rectangle(x, y, btnW, btnH, 0x000000, 0)
            .setInteractive({ useHandCursor: true })
            .setDepth(5);

        hitArea.on('pointerover', () => {
            btnBg.clear();
            drawPanel(btnBg, x - btnW / 2, y - btnH / 2, btnW, btnH, 8, 0x3a3a6a);
        });
        hitArea.on('pointerout', () => {
            btnBg.clear();
            drawPanel(btnBg, x - btnW / 2, y - btnH / 2, btnW, btnH, 8);
        });
        hitArea.on('pointerdown', onClick);
    }

    private generateSparkTexture() {
        if (this.textures.exists('spark')) return;
        const g = this.add.graphics();
        g.fillStyle(0xffffff, 1);
        g.fillCircle(3, 3, 3);
        g.generateTexture('spark', 6, 6);
        g.destroy();
    }

    private generateIcons() {
        const g = this.add.graphics();
        const gen = (draw: () => void, key: string, w: number, h: number) => {
            if (this.textures.exists(key)) return;
            draw();
            g.generateTexture(key, w, h);
            g.clear();
        };

        // Shield (blue)
        gen(
            () => {
                g.fillStyle(0x3b82f6);
                g.fillRoundedRect(6, 2, 20, 24, { tl: 4, tr: 4, bl: 10, br: 10 });
                g.fillStyle(0x60a5fa);
                g.fillRect(13, 6, 6, 10);
            },
            'icon-shield',
            32,
            28,
        );

        // Heart (red)
        gen(
            () => {
                g.fillStyle(0xef4444);
                g.fillCircle(10, 10, 7);
                g.fillCircle(22, 10, 7);
                g.fillTriangle(3, 12, 29, 12, 16, 26);
            },
            'icon-heart',
            32,
            28,
        );

        // Resize arrows (cyan)
        gen(
            () => {
                g.fillStyle(0x22d3ee);
                g.fillRect(4, 10, 24, 4);
                g.fillTriangle(0, 12, 8, 6, 8, 18);
                g.fillTriangle(32, 12, 24, 6, 24, 18);
            },
            'icon-resize',
            32,
            24,
        );

        // Bullet (yellow)
        gen(
            () => {
                g.fillStyle(0xfbbf24);
                g.fillRect(12, 10, 8, 16);
                g.fillTriangle(12, 10, 20, 10, 16, 2);
            },
            'icon-bullet',
            32,
            28,
        );

        // Missile (orange-red)
        gen(
            () => {
                const cx = 16;
                // Body
                g.fillStyle(0xf97316);
                g.fillRect(cx - 4, 8, 8, 14);
                // Nose cone
                g.fillStyle(0xef4444);
                g.fillTriangle(cx, 2, cx - 4, 8, cx + 4, 8);
                // Tail fins
                g.fillStyle(0xdc2626);
                g.fillTriangle(cx - 4, 18, cx - 8, 24, cx - 4, 22);
                g.fillTriangle(cx + 4, 18, cx + 8, 24, cx + 4, 22);
            },
            'icon-missile',
            32,
            28,
        );

        // Coin (gold)
        gen(
            () => {
                g.fillStyle(0xf59e0b);
                g.fillCircle(14, 14, 12);
                g.fillStyle(0xd97706);
                g.fillCircle(14, 14, 8);
                g.fillStyle(0xf59e0b);
                g.fillRect(12, 8, 4, 12);
            },
            'icon-coin',
            28,
            28,
        );

        g.destroy();
    }
}
