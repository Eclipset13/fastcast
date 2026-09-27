import type { PlayerState } from '../types';

class GameStore {
  player: PlayerState | null = null;
}

export const gameStore = new GameStore();
