export interface GameProgress {
    coins: number;
    level: number;
    upgrades: {
        paddleHp: number;
        extraLives: number;
        paddleWidth: number;
        shooting: number;
        coinMultiplier: number;
        missile: number;
    };
}

const SAVE_KEY = 'smashloop-save';

const DEFAULT_PROGRESS: GameProgress = {
    coins: 0,
    level: 1,
    upgrades: {
        paddleHp: 0,
        extraLives: 0,
        paddleWidth: 0,
        shooting: 0,
        coinMultiplier: 0,
        missile: 0,
    },
};

export function loadProgress(): GameProgress {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return structuredClone(DEFAULT_PROGRESS);
    const saved = JSON.parse(raw) as Partial<GameProgress>;
    const defaults = structuredClone(DEFAULT_PROGRESS);
    return {
        coins: saved.coins ?? defaults.coins,
        level: saved.level ?? defaults.level,
        upgrades: { ...defaults.upgrades, ...saved.upgrades },
    };
}

export function saveProgress(p: GameProgress): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(p));
}
