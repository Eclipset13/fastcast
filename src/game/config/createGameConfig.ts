import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, MOVEMENT } from './constants';
import { GameScene } from '../scenes/GameScene';

export const createGameConfig = (): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  backgroundColor: '#071c18',
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: MOVEMENT.gravity }, debug: false },
  },
  // Cover the viewport uniformly; combat is a DOM overlay and never resizes the world.
  scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [GameScene],
  render: { pixelArt: true, antialias: false, roundPixels: true },
});
