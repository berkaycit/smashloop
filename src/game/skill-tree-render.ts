import Phaser from 'phaser';
import { upgradeCost } from './upgrades';
import type { UpgradeDef } from './upgrades';
import { FONT_FAMILY } from './ui-utils';

export type NodeState = 'locked' | 'available' | 'unlocked' | 'maxed';

const NODE_SIZE = 80;
const HALF = NODE_SIZE / 2;
const RADIUS = 12;
const BORDER_W = 2;
const NODE_BG = 0x222244;

const STATE_COLORS: Record<NodeState, number> = {
    locked: 0x4a4a5f,
    available: 0x3b82f6,
    unlocked: 0x22c55e,
    maxed: 0xf59e0b,
};

export function getNodeState(level: number, maxLevel: number, prereqsMet: boolean): NodeState {
    if (level >= maxLevel) return 'maxed';
    if (level > 0) return 'unlocked';
    if (prereqsMet) return 'available';
    return 'locked';
}

export function stateColor(state: NodeState): number {
    return STATE_COLORS[state];
}

export function drawNodeBg(
    g: Phaser.GameObjects.Graphics,
    borderColor: number,
    borderWidth = BORDER_W,
): void {
    g.clear();
    g.fillStyle(NODE_BG, 1);
    g.fillRoundedRect(-HALF, -HALF, NODE_SIZE, NODE_SIZE, RADIUS);
    g.lineStyle(borderWidth, borderColor, 1);
    g.strokeRoundedRect(-HALF, -HALF, NODE_SIZE, NODE_SIZE, RADIUS);
}

export function drawConnection(
    g: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: number,
): void {
    g.lineStyle(3, color, 1);
    g.lineBetween(x1, y1, x2, y2);
}

export function connectionColor(sourceLevel: number, targetLevel: number): number {
    if (sourceLevel > 0 && targetLevel > 0) return 0x22c55e;
    if (sourceLevel > 0) return 0x3b82f6;
    return 0x3f3f46;
}

export function createNodeContainer(
    scene: Phaser.Scene,
    def: UpgradeDef,
    level: number,
    state: NodeState,
    coins: number,
): Phaser.GameObjects.Container {
    const dpr = window.devicePixelRatio;
    const color = stateColor(state);

    const bg = scene.add.graphics();
    bg.setName('bg');
    drawNodeBg(bg, color);

    const iconKey = `icon-${def.icon}`;
    const icon = scene.add.image(0, -6, iconKey);

    const levelText = scene.add
        .text(0, 16, `${level}/${def.maxLevel}`, {
            fontFamily: FONT_FAMILY,
            fontSize: '14px',
            color: '#aaaacc',
        })
        .setResolution(dpr)
        .setOrigin(0.5);

    const nameText = scene.add
        .text(0, -HALF - 18, def.name, {
            fontFamily: FONT_FAMILY,
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold',
        })
        .setResolution(dpr)
        .setOrigin(0.5);

    const isMaxed = level >= def.maxLevel;
    const cost = isMaxed ? 0 : upgradeCost(def, level);
    const canAfford = !isMaxed && (state === 'available' || state === 'unlocked') && coins >= cost;
    const costLabel = isMaxed ? 'MAX' : `${cost} coin`;
    const costColor = isMaxed ? '#f59e0b' : canAfford ? '#22c55e' : '#aaaacc';
    const costText = scene.add
        .text(0, 32, costLabel, {
            fontFamily: FONT_FAMILY,
            fontSize: '13px',
            color: costColor,
        })
        .setResolution(dpr)
        .setOrigin(0.5);

    const container = scene.add.container(def.x, def.y, [bg, icon, levelText, nameText, costText]);
    container.setSize(NODE_SIZE, NODE_SIZE);
    container.setDepth(2);

    return container;
}
