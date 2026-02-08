export interface UpgradeDef {
    key: string;
    name: string;
    description: string;
    maxLevel: number;
    baseCost: number;
    costScale: number;
    effectLabel: (level: number) => string;
    icon: string;
    x: number;
    y: number;
    prerequisites: string[];
}

export const UPGRADES: UpgradeDef[] = [
    {
        key: 'paddleHp',
        name: 'Paddle HP',
        description: 'Paddle takes more hits before breaking',
        maxLevel: 25,
        baseCost: 15,
        costScale: 1.36,
        effectLabel: (l) => `HP: ${5 + l * 2}`,
        icon: 'shield',
        x: 512,
        y: 100,
        prerequisites: [],
    },
    {
        key: 'extraLives',
        name: 'Extra Lives',
        description: 'Start with more lives',
        maxLevel: 6,
        baseCost: 30,
        costScale: 4.0,
        effectLabel: (l) => `Lives: ${1 + l}`,
        icon: 'heart',
        x: 712,
        y: 310,
        prerequisites: ['paddleHp'],
    },
    {
        key: 'paddleWidth',
        name: 'Paddle Width',
        description: 'Wider paddle to catch the ball',
        maxLevel: 5,
        baseCost: 15,
        costScale: 3.0,
        effectLabel: (l) => `Width: ${80 + l * 20}px`,
        icon: 'resize',
        x: 312,
        y: 310,
        prerequisites: ['paddleHp'],
    },
    {
        key: 'shooting',
        name: 'Shooting',
        description: 'Fire bullets with Left-click',
        maxLevel: 5,
        baseCost: 40,
        costScale: 2.5,
        effectLabel: (l) => (l === 0 ? 'Locked' : `Ammo: ${l * 4}`),
        icon: 'bullet',
        x: 312,
        y: 520,
        prerequisites: ['paddleWidth'],
    },
    {
        key: 'coinMultiplier',
        name: 'Coin Multiplier',
        description: 'Earn more coins per brick',
        maxLevel: 10,
        baseCost: 25,
        costScale: 2.2,
        effectLabel: (l) => `x${1 + l * 0.5}`,
        icon: 'coin',
        x: 712,
        y: 520,
        prerequisites: ['extraLives'],
    },
    {
        key: 'missile',
        name: 'Missile',
        description: 'Launch missiles with Right-click',
        maxLevel: 3,
        baseCost: 100,
        costScale: 40,
        effectLabel: (l) => (l === 0 ? 'Locked' : `Ammo: 3 | Radius: ${80 + l * 20}`),
        icon: 'missile',
        x: 512,
        y: 640,
        prerequisites: ['shooting', 'coinMultiplier'],
    },
];

export function upgradeCost(def: UpgradeDef, level: number): number {
    return Math.floor(def.baseCost * Math.pow(def.costScale, level));
}
