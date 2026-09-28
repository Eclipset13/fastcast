import Phaser from 'phaser';
import './style.css';
import './ui/spellcraft.css';
import { createGameConfig } from './game/config/createGameConfig';
import type { ClassDefinition } from './game/types';
import { GameUI } from './ui/GameUI';

let game: Phaser.Game | null = null;

new GameUI((_classDef: ClassDefinition) => {
  game?.destroy(true);
  game = new Phaser.Game(createGameConfig());
  return game;
});
