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
        maxLevel: 10,
        baseCost: 15,
        costScale: 1.5,
        effectLabel: (l) => `HP: ${5 + l * 3}`,
        icon: 'shield',
        x: 512,
        y: 100,
        prerequisites: [],
    },
    {
        key: 'extraLives',
        name: 'Extra Lives',
        description: 'Start with more lives',
        maxLevel: 3,
        baseCost: 50,
        costScale: 2.5,
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
        baseCost: 20,
        costScale: 1.6,
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
        costScale: 1.5,
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
        costScale: 1.7,
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
        baseCost: 60,
        costScale: 1.8,
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
