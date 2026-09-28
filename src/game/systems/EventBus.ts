import Phaser from 'phaser';

export const events = new Phaser.Events.EventEmitter();

export const GameEvents = {
  playerChanged: 'player:changed',
  battleStarted: 'battle:started',
  battleChanged: 'battle:changed',
  battleEnded: 'battle:ended',
  battleExited: 'battle:exited',
  upgradeRequested: 'upgrade:requested',
  upgradePurchased: 'upgrade:purchased',
  upgradeMenuClosed: 'upgrade:menu-closed',
  toast: 'ui:toast',
} as const;
