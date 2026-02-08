import { Scene } from 'phaser';
import { loadProgress, saveProgress } from '../persistence';
import { UPGRADES, upgradeCost } from '../upgrades';
import type { GameProgress } from '../persistence';

export class Upgrade extends Scene {
    constructor() {
        super('Upgrade');
    }

    create() {
        const { width } = this.scale;
        const cx = width / 2;
        const progress = loadProgress();

        const dpr = window.devicePixelRatio;
        this.add
            .text(cx, 30, `Coins: ${progress.coins}`, {
                fontSize: '28px',
                color: '#ffcc11',
                fontStyle: 'bold',
            })
            .setResolution(dpr)
            .setOrigin(0.5);

        this.createButton(width - 80, 30, 'BACK', () => {
            this.scene.start('Game');
        });

        const cardStartY = 100;
        const cardH = 80;
        const cardGap = 20;

        for (let i = 0; i < UPGRADES.length; i++) {
            const def = UPGRADES[i];
            const y = cardStartY + i * (cardH + cardGap);
            this.createUpgradeCard(cx, y, cardH, def, progress);
        }
    }

    private createUpgradeCard(
        cx: number,
        y: number,
        h: number,
        def: (typeof UPGRADES)[number],
        progress: GameProgress,
    ) {
        const cardW = 600;
        const level = progress.upgrades[def.key as keyof typeof progress.upgrades];
        const isMaxed = level >= def.maxLevel;
        const cost = isMaxed ? 0 : upgradeCost(def, level);
        const canAfford = !isMaxed && progress.coins >= cost;

        this.add.rectangle(cx, y + h / 2, cardW, h, 0x222244, 1);

        const dpr = window.devicePixelRatio;
        this.add
            .text(cx - cardW / 2 + 20, y + 10, def.name, {
                fontSize: '20px',
                color: '#ffffff',
                fontStyle: 'bold',
            })
            .setResolution(dpr)
            .setOrigin(0, 0);

        this.add
            .text(cx - cardW / 2 + 20, y + 38, `${def.description}`, {
                fontSize: '14px',
                color: '#aaaacc',
            })
            .setResolution(dpr)
            .setOrigin(0, 0);

        this.add
            .text(cx + 60, y + 12, `Lv ${level}/${def.maxLevel}`, {
                fontSize: '16px',
                color: '#88aaff',
            })
            .setResolution(dpr)
            .setOrigin(0, 0);

        this.add
            .text(cx + 60, y + 36, def.effectLabel(level), {
                fontSize: '14px',
                color: '#66dd88',
            })
            .setResolution(dpr)
            .setOrigin(0, 0);

        const btnX = cx + cardW / 2 - 70;
        const btnY = y + h / 2;

        if (isMaxed) {
            this.add
                .text(btnX, btnY, 'MAX', {
                    fontSize: '18px',
                    color: '#888888',
                    fontStyle: 'bold',
                })
                .setResolution(dpr)
                .setOrigin(0.5);
        } else {
            const btnColor = canAfford ? 0x44aa44 : 0x555555;
            const bg = this.add.rectangle(btnX, btnY, 110, 36, btnColor, 1);
            this.add
                .text(btnX, btnY, `${cost} coins`, {
                    fontSize: '16px',
                    color: canAfford ? '#ffffff' : '#888888',
                })
                .setResolution(dpr)
                .setOrigin(0.5);

            if (canAfford) {
                bg.setInteractive();
                bg.on('pointerover', () => bg.setFillStyle(0x66cc66));
                bg.on('pointerout', () => bg.setFillStyle(0x44aa44));
                bg.on('pointerdown', () => {
                    const p = loadProgress();
                    const key = def.key as keyof typeof p.upgrades;
                    if (p.coins >= cost && p.upgrades[key] < def.maxLevel) {
                        p.coins -= cost;
                        p.upgrades[key]++;
                        saveProgress(p);
                        this.scene.restart();
                    }
                });
            }
        }
    }

    private createButton(x: number, y: number, label: string, onClick: () => void) {
        const bg = this.add.rectangle(x, y, 120, 36, 0x334455, 1).setInteractive();
        this.add
            .text(x, y, label, { fontSize: '18px', color: '#ffffff', fontStyle: 'bold' })
            .setResolution(window.devicePixelRatio)
            .setOrigin(0.5);

        bg.on('pointerover', () => bg.setFillStyle(0x4499ff));
        bg.on('pointerout', () => bg.setFillStyle(0x334455));
        bg.on('pointerdown', onClick);
    }
}
