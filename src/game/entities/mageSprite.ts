/** Generated sheet: four columns, two rows, eight right-facing walking poses. */
export const MAGE_SPRITE = {
  key: 'hero-mage-sheet',
  path: '/assets/characters/mage/mage-walk.png',
  frameWidth: 362,
  frameHeight: 543,
  displayHeight: 36,
  footY: 543,
  idleFrame: 1,
  airborneFrame: 3,
} as const;

/** Anticipation, push-off, rise, apex, descent, impact and recovery. */
export const MAGE_JUMP_SPRITE = {
  key: 'hero-mage-jump-sheet',
  path: '/assets/characters/mage/mage-jump.png',
  cellWidth: 384,
  cellHeight: 512,
  rowOffsets: [0, -10],
  frameWidth: 384,
  frameHeight: 512,
  footY: 484,
  displayHeight: 40,
} as const;

/** Source cells include transparent gutters; trim consistently within each row. */
export const MAGE_RUN_SPRITE = {
  key: 'hero-mage-run-sheet',
  path: '/assets/characters/mage/mage-run.png',
  cellWidth: 384,
  cellHeight: 512,
  cropX: 40,
  cropY: [120, 90],
  frameWidth: 312,
  frameHeight: 352,
  footY: 342,
  displayHeight: 35,
  animation: 'hero-mage-run',
  frameRate: 14,
  airborneFrame: 3,
} as const;
