export interface GameProgress {
    coins: number;
    upgrades: {
        paddleHp: number;
        extraLives: number;
        paddleWidth: number;
        shooting: number;
        coinMultiplier: number;
    };
}

const SAVE_KEY = 'smashloop-save';

const DEFAULT_PROGRESS: GameProgress = {
    coins: 0,
    upgrades: {
        paddleHp: 0,
        extraLives: 0,
        paddleWidth: 0,
        shooting: 0,
        coinMultiplier: 0,
    },
};

export function loadProgress(): GameProgress {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return structuredClone(DEFAULT_PROGRESS);
    return JSON.parse(raw) as GameProgress;
}

export function saveProgress(p: GameProgress): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(p));
}
