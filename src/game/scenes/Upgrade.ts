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
    drawConnection,
    connectionColor,
    createNodeContainer,
} from '../skill-tree-render';

const HOVER_BORDER = 0x60a5fa;
const UPGRADE_MAP = new Map(UPGRADES.map((u) => [u.key, u]));

export class Upgrade extends Scene {
    constructor() {
        super('Upgrade');
    }

    create() {
        const { width } = this.scale;
        const progress = loadProgress();
        const dpr = window.devicePixelRatio;

        this.generateIcons();

        // Coins
        this.add
            .text(20, 24, `Total Coin: ${progress.coins}`, {
                fontFamily: FONT_FAMILY,
                fontSize: '22px',
                color: '#ffcc11',
                fontStyle: 'bold',
            })
            .setResolution(dpr);

        // Back button
        this.createButton(width - 80, 30, 'BACK', () => {
            this.scene.start('Game');
        });

        // Connections (depth 1)
        this.drawConnections(progress);

        // Nodes (depth 2)
        for (const def of UPGRADES) {
            const level = upgradeLevel(progress, def.key);
            const prereqsMet = def.prerequisites.every((k) => upgradeLevel(progress, k) >= 1);
            const state = getNodeState(level, def.maxLevel, prereqsMet);
            const container = createNodeContainer(this, def, level, state, progress.coins);
            this.setupInteraction(container, def, progress, state);
        }
    }

    private drawConnections(progress: GameProgress) {
        const g = this.add.graphics();
        g.setDepth(1);

        for (const def of UPGRADES) {
            for (const prereqKey of def.prerequisites) {
                const prereq = UPGRADE_MAP.get(prereqKey)!;
                const srcLevel = upgradeLevel(progress, prereq.key);
                const tgtLevel = upgradeLevel(progress, def.key);
                const color = connectionColor(srcLevel, tgtLevel);

                // Offset start/end to node edges
                const angle = Math.atan2(def.y - prereq.y, def.x - prereq.x);
                const startX = prereq.x + Math.cos(angle) * 40;
                const startY = prereq.y + Math.sin(angle) * 40;
                const endX = def.x - Math.cos(angle) * 40;
                const endY = def.y - Math.sin(angle) * 40;

                drawConnection(g, startX, startY, endX, endY, color);
            }
        }
    }

    private setupInteraction(
        container: Phaser.GameObjects.Container,
        def: UpgradeDef,
        progress: GameProgress,
        state: string,
    ) {
        const hitArea = this.add.rectangle(0, 0, 80, 80, 0x000000, 0);
        container.add(hitArea);
        hitArea.setInteractive({ useHandCursor: state === 'available' || state === 'unlocked' });

        const dpr = window.devicePixelRatio;
        let tooltipContainer: Phaser.GameObjects.Container | null = null;

        hitArea.on('pointerover', () => {
            const bg = container.getByName('bg') as Phaser.GameObjects.Graphics;
            if (bg) drawNodeBg(bg, HOVER_BORDER, 3);

            const level = upgradeLevel(progress, def.key);
            const isMaxed = level >= def.maxLevel;
            const cost = isMaxed ? '' : `Cost: ${upgradeCost(def, level)}`;
            const effect = def.effectLabel(level);
            const lines = [def.description, effect, cost].filter(Boolean).join('\n');

            const text = this.add
                .text(0, 0, lines, {
                    fontFamily: FONT_FAMILY,
                    fontSize: '15px',
                    color: '#ccccee',
                    align: 'center',
                    lineSpacing: 4,
                })
                .setResolution(dpr)
                .setOrigin(0.5, 0);

            const padX = 12;
            const padY = 8;
            const tooltipBg = this.add.graphics();
            drawPanel(
                tooltipBg,
                -text.width / 2 - padX,
                -padY,
                text.width + padX * 2,
                text.height + padY * 2,
                8,
                undefined,
                0.95,
            );

            tooltipContainer = this.add.container(def.x, def.y + 64, [tooltipBg, text]);
            tooltipContainer.setDepth(10);
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

    private purchase(def: UpgradeDef, container: Phaser.GameObjects.Container) {
        const p = loadProgress();
        const level = upgradeLevel(p, def.key);
        const cost = upgradeCost(def, level);

        if (p.coins < cost || level >= def.maxLevel) return;

        p.coins -= cost;
        (p.upgrades as Record<string, number>)[def.key]++;
        saveProgress(p);

        this.tweens.add({
            targets: container,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 75,
            yoyo: true,
            onComplete: () => this.scene.restart(),
        });
    }

    private createButton(x: number, y: number, label: string, onClick: () => void) {
        const bg = this.add.rectangle(x, y, 120, 36, 0x334455, 1).setInteractive();
        this.add
            .text(x, y, label, {
                fontFamily: FONT_FAMILY,
                fontSize: '18px',
                color: '#ffffff',
                fontStyle: 'bold',
            })
            .setResolution(window.devicePixelRatio)
            .setOrigin(0.5);

        bg.on('pointerover', () => bg.setFillStyle(0x4499ff));
        bg.on('pointerout', () => bg.setFillStyle(0x334455));
        bg.on('pointerdown', onClick);
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
