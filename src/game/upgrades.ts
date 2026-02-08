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
        y: 120,
        prerequisites: [],
    },
    {
        key: 'extraLives',
        name: 'Extra Lives',
        description: 'Start with more lives',
        maxLevel: 4,
        baseCost: 50,
        costScale: 2.5,
        effectLabel: (l) => `Lives: ${1 + l}`,
        icon: 'heart',
        x: 712,
        y: 380,
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
        y: 380,
        prerequisites: ['paddleHp'],
    },
    {
        key: 'shooting',
        name: 'Shooting',
        description: 'Fire bullets to destroy bricks',
        maxLevel: 5,
        baseCost: 40,
        costScale: 1.5,
        effectLabel: (l) => (l === 0 ? 'Locked' : `Ammo: ${l * 4}`),
        icon: 'bullet',
        x: 312,
        y: 640,
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
        y: 640,
        prerequisites: ['extraLives'],
    },
];

export function upgradeCost(def: UpgradeDef, level: number): number {
    return Math.floor(def.baseCost * Math.pow(def.costScale, level));
}
