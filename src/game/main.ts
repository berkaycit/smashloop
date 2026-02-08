import { Game as MainGame } from './scenes/Game';
import { Upgrade } from './scenes/Upgrade';
import { AUTO, Game, Scale, Types } from 'phaser';

// Find out more information about the Game Config at:
// https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Types.Core.GameConfig = {
    type: AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    antialias: true,
    roundPixels: true,
    physics: {
        default: 'arcade',
        arcade: {},
    },
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH,
    },
    scene: [MainGame, Upgrade],
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
};

export default StartGame;
