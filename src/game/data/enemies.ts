import type { EnemyDefinition } from '../types';

export const FOREST_WRAITH: EnemyDefinition = {
  id: 'forest-wraith', name: 'Briar Wraith', hp: 58, attack: 9, interval: 3.4, xp: 42,
  color: 0x173e30, accent: 0x87e89d,
  defenseWarningDuration: 1, perfectWindow: 0.2,
};

export const BOSS_SCAFFOLDS: EnemyDefinition[] = [
  { id: 'void-knight', name: 'Void Knight', hp: 260, attack: 18, interval: 3, xp: 240, color: 0x202235, accent: 0x9c90ff, boss: true, unlock: 'doubleJump' },
  { id: 'crystal-warden', name: 'Crystal Warden', hp: 390, attack: 23, interval: 2.7, xp: 380, color: 0x27244b, accent: 0x68baff, boss: true, unlock: 'longDash' },
];
