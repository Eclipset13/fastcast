export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;
export const WORLD_WIDTH = 2600;
export const GROUND_Y = 226;

export const MOVEMENT = {
  runSpeed: 128,
  jumpSpeed: 330,
  dashSpeed: 360,
  dashDuration: 165,
  dashCooldown: 520,
  gravity: 850,
  jumpAnticipation: 80,
  jumpBuffer: 110,
  landingRecovery: 170,
  landingSpeedFactor: 0.6,
} as const;

export const COMBAT_TUNING = {
  encounterDistance: 142,
  encounterHeight: 24,
  minimumSpacing: 100,
  cameraDuration: 380,
  revealDelay: 300,
  inputDelay: 450,
  nextSpellDelay: 280,
  miscastDelay: 380,
  endDelay: 300,
  defenseWarningDuration: 1,
  perfectWindow: 0.2,
  criticalMultiplier: 1.7,
  miscastBase: 0.05,
  miscastProgress: 0.08,
  slowCps: 2,
  fastCps: 7,
  minMultiplier: 0.5,
  maxMultiplier: 2,
  tierMultiplier: [1, 1.6, 2.4] as const,
  levelDamageBonus: 0.06,
} as const;

export const xpForLevel = (level: number) => Math.round(60 * Math.pow(level, 1.5));
