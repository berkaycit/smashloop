import Phaser from 'phaser';
import { upgradeCost } from './upgrades';
import type { UpgradeDef } from './upgrades';
import { FONT_FAMILY } from './ui-utils';

export type NodeState = 'locked' | 'available' | 'unlocked' | 'maxed';

export const NODE_RADIUS = 48;
const GLOW_RADIUS = 56;
const INNER_RADIUS = 40;
const RING_RADIUS = 52;
const RING_WIDTH = 5;
const BORDER_W = 2;
const NODE_BG = 0x222248;

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

    // Outer glow
    g.fillStyle(borderColor, 0.08);
    g.fillCircle(0, 0, GLOW_RADIUS);

    // Main fill
    g.fillStyle(NODE_BG, 1);
    g.fillCircle(0, 0, NODE_RADIUS);

    // Inner highlight
    g.fillStyle(0x343468, 0.4);
    g.fillCircle(0, 0, INNER_RADIUS);

    // Border
    g.lineStyle(borderWidth, borderColor, 1);
    g.strokeCircle(0, 0, NODE_RADIUS);
}

export function drawProgressRing(
    g: Phaser.GameObjects.Graphics,
    fraction: number,
    color: number,
): void {
    g.clear();
    const startAngle = -Math.PI / 2;

    // Track ring (faint)
    g.lineStyle(RING_WIDTH, color, 0.3);
    g.beginPath();
    g.arc(0, 0, RING_RADIUS, startAngle, startAngle + Math.PI * 2, false);
    g.strokePath();

    // Progress arc
    if (fraction > 0) {
        const endAngle = startAngle + Math.PI * 2 * fraction;
        g.lineStyle(RING_WIDTH, color, 1);
        g.beginPath();
        g.arc(0, 0, RING_RADIUS, startAngle, endAngle, false);
        g.strokePath();
    }
}

export function connectionColor(sourceLevel: number, targetLevel: number): number {
    if (sourceLevel > 0 && targetLevel > 0) return 0x22c55e;
    if (sourceLevel > 0) return 0x3b82f6;
    return 0x3f3f46;
}

export function drawConnections(
    g: Phaser.GameObjects.Graphics,
    upgrades: UpgradeDef[],
    getLevel: (key: string) => number,
): void {
    const canvasCenterX = 512;
    const canvasCenterY = 400;
    const byKey = new Map(upgrades.map((u) => [u.key, u]));

    for (const def of upgrades) {
        for (const prereqKey of def.prerequisites) {
            const prereq = byKey.get(prereqKey)!;
            const srcLevel = getLevel(prereq.key);
            const tgtLevel = getLevel(def.key);
            const color = connectionColor(srcLevel, tgtLevel);
            const unlocked = srcLevel > 0 && tgtLevel > 0;

            // Offset start/end to node edges
            const angle = Math.atan2(def.y - prereq.y, def.x - prereq.x);
            const startX = prereq.x + Math.cos(angle) * NODE_RADIUS;
            const startY = prereq.y + Math.sin(angle) * NODE_RADIUS;
            const endX = def.x - Math.cos(angle) * NODE_RADIUS;
            const endY = def.y - Math.sin(angle) * NODE_RADIUS;

            // Control point curved toward canvas center
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            const cpX = midX + (canvasCenterX - midX) * 0.15;
            const cpY = midY + (canvasCenterY - midY) * 0.15;

            if (unlocked) {
                // Glow line
                g.lineStyle(6, color, 0.25);
                drawSolidBezier(g, startX, startY, cpX, cpY, endX, endY);
                // Solid line
                g.lineStyle(2.5, color, 1);
                drawSolidBezier(g, startX, startY, cpX, cpY, endX, endY);
            } else {
                // Dashed bezier
                drawDashedBezier(g, startX, startY, cpX, cpY, endX, endY, color, 0.4, 8, 8);
            }
        }
    }
}

interface Point {
    x: number;
    y: number;
}

function sampleBezier(
    x1: number,
    y1: number,
    cpx: number,
    cpy: number,
    x2: number,
    y2: number,
    steps: number,
): Point[] {
    const points: Point[] = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const invT = 1 - t;
        points.push({
            x: invT * invT * x1 + 2 * invT * t * cpx + t * t * x2,
            y: invT * invT * y1 + 2 * invT * t * cpy + t * t * y2,
        });
    }
    return points;
}

function strokePoints(g: Phaser.GameObjects.Graphics, points: Point[], from: number, to: number) {
    g.beginPath();
    g.moveTo(points[from].x, points[from].y);
    for (let i = from + 1; i <= to; i++) {
        g.lineTo(points[i].x, points[i].y);
    }
    g.strokePath();
}

function drawSolidBezier(
    g: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    cpx: number,
    cpy: number,
    x2: number,
    y2: number,
): void {
    strokePoints(g, sampleBezier(x1, y1, cpx, cpy, x2, y2, 30), 0, 30);
}

function drawDashedBezier(
    g: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    cpx: number,
    cpy: number,
    x2: number,
    y2: number,
    color: number,
    alpha: number,
    dashLen: number,
    gapLen: number,
): void {
    const points = sampleBezier(x1, y1, cpx, cpy, x2, y2, 60);

    g.lineStyle(2.5, color, alpha);
    let dist = 0;
    let drawing = true;
    let segTarget = dashLen;
    let segStart = 0;

    for (let i = 1; i < points.length; i++) {
        const dx = points[i].x - points[i - 1].x;
        const dy = points[i].y - points[i - 1].y;
        dist += Math.sqrt(dx * dx + dy * dy);

        if (drawing && dist >= segTarget) {
            strokePoints(g, points, segStart, i);
            drawing = false;
            segTarget = dist + gapLen;
            segStart = i;
        } else if (!drawing && dist >= segTarget) {
            drawing = true;
            segTarget = dist + dashLen;
            segStart = i;
        }
    }

    if (drawing && segStart < points.length - 1) {
        strokePoints(g, points, segStart, points.length - 1);
    }
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

    const ring = scene.add.graphics();
    ring.setName('ring');
    drawProgressRing(ring, level / def.maxLevel, color);

    const iconKey = `icon-${def.icon}`;
    const icon = scene.add.image(0, -6, iconKey).setScale(1.3);

    const levelText = scene.add
        .text(0, 20, `${level}/${def.maxLevel}`, {
            fontFamily: FONT_FAMILY,
            fontSize: '14px',
            color: '#aaaacc',
        })
        .setResolution(dpr)
        .setOrigin(0.5);

    const nameText = scene.add
        .text(0, -NODE_RADIUS - 18, def.name, {
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
        .text(0, NODE_RADIUS + 12, costLabel, {
            fontFamily: FONT_FAMILY,
            fontSize: '13px',
            color: costColor,
        })
        .setResolution(dpr)
        .setOrigin(0.5);

    const container = scene.add.container(def.x, def.y, [
        bg,
        ring,
        icon,
        levelText,
        nameText,
        costText,
    ]);
    container.setSize(NODE_RADIUS * 2, NODE_RADIUS * 2);
    container.setDepth(2);

    return container;
}
