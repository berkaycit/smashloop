import Phaser from 'phaser';
import type { GameProgress } from './persistence';

export const FONT_FAMILY = '"Trebuchet MS", "Segoe UI", Arial, sans-serif';

const PANEL_FILL = 0x2a2a4a;
const PANEL_FILL_ALPHA = 0.92;
const PANEL_STROKE = 0x4a4a6a;

export function drawPanel(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    radius = 12,
    fill = PANEL_FILL,
    fillAlpha = PANEL_FILL_ALPHA,
    stroke = PANEL_STROKE,
): void {
    g.fillStyle(fill, fillAlpha);
    g.fillRoundedRect(x, y, w, h, radius);
    g.lineStyle(1, stroke, 1);
    g.strokeRoundedRect(x, y, w, h, radius);
}

export function upgradeLevel(progress: GameProgress, key: string): number {
    return progress.upgrades[key as keyof typeof progress.upgrades];
}
