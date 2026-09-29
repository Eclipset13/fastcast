import Phaser from 'phaser';
import type { EnemyVisualConfig, EnemyVisualFrame } from './EnemyVisualConfig';

export const FOREST_SAVAGE_IDLE = {
  key: 'forest-savage-idle',
  path: '/assets/characters/enemies/forest-savage/idle.png',
} as const;

export const FOREST_SAVAGE_WALK = {
  key: 'forest-savage-walk',
  path: '/assets/characters/enemies/forest-savage/walk-sheet.png',
  animation: 'forest-savage-walk-anim',
  frameRate: 10,
} as const;

export const FOREST_SAVAGE_ATTACK = {
  key: 'forest-savage-attack',
  path: '/assets/characters/enemies/forest-savage/attack-sheet.png',
  animation: 'forest-savage-attack-anim',
  frameRate: 12,
  impactFrame: 4,
} as const;

const WALK_FEET = [485, 487, 489, 487, 409, 408, 410, 411] as const;
const WALK_ANCHORS = [198, 202, 196, 196, 199, 202, 196, 198] as const;

const walkFrames: EnemyVisualFrame[] = Array.from({ length: 8 }, (_, index) => ({
  name: `walk-${index}`,
  x: (index % 4) * 384,
  y: Math.floor(index / 4) * 512,
  width: 384,
  height: 512,
  anchorX: WALK_ANCHORS[index],
  footY: WALK_FEET[index],
}));

// 1924 cannot be divided into eight integer-width cells. These rounded boundaries
// preserve every source pixel without stretching or dropping the four remainder pixels.
const ATTACK_BOUNDARIES = [0, 241, 481, 722, 962, 1203, 1443, 1684, 1924] as const;
const ATTACK_ANCHORS = [132, 150, 148, 130, 118, 105, 92, 80] as const;
const attackFrames: EnemyVisualFrame[] = Array.from({ length: 8 }, (_, index) => ({
  name: `attack-${index}`,
  x: ATTACK_BOUNDARIES[index],
  y: 0,
  width: ATTACK_BOUNDARIES[index + 1] - ATTACK_BOUNDARIES[index],
  height: 724,
  anchorX: ATTACK_ANCHORS[index],
  footY: 552,
}));

export const FOREST_SAVAGE_VISUAL: EnemyVisualConfig = {
  idle: {
    texture: FOREST_SAVAGE_IDLE.key,
    scale: 43 / 748,
    frame: { name: '__BASE', x: 0, y: 0, width: 1254, height: 1254, anchorX: 620, footY: 1020 },
  },
  walk: {
    texture: FOREST_SAVAGE_WALK.key,
    animation: FOREST_SAVAGE_WALK.animation,
    frameRate: FOREST_SAVAGE_WALK.frameRate,
    scale: 43 / 369,
    frames: walkFrames,
    repeat: -1,
  },
  attack: {
    texture: FOREST_SAVAGE_ATTACK.key,
    animation: FOREST_SAVAGE_ATTACK.animation,
    frameRate: FOREST_SAVAGE_ATTACK.frameRate,
    scale: 43 / 214,
    frames: attackFrames,
    repeat: 0,
    impactFrame: FOREST_SAVAGE_ATTACK.impactFrame,
  },
  body: { width: 18, height: 30 },
  sourceFaces: 'right',
};

export function preloadForestSavage(scene: Phaser.Scene): void {
  scene.load.image(FOREST_SAVAGE_IDLE.key, FOREST_SAVAGE_IDLE.path);
  scene.load.image(FOREST_SAVAGE_WALK.key, FOREST_SAVAGE_WALK.path);
  scene.load.image(FOREST_SAVAGE_ATTACK.key, FOREST_SAVAGE_ATTACK.path);
}

function addFrames(scene: Phaser.Scene, textureKey: string, frames: readonly EnemyVisualFrame[]): void {
  const texture = scene.textures.get(textureKey);
  for (const frame of frames) {
    if (!texture.has(frame.name)) texture.add(frame.name, 0, frame.x, frame.y, frame.width, frame.height);
  }
}

export function createForestSavageAnimations(scene: Phaser.Scene): void {
  const { walk, attack } = FOREST_SAVAGE_VISUAL;
  if (walk) {
    addFrames(scene, walk.texture, walk.frames);
    if (!scene.anims.exists(walk.animation)) scene.anims.create({
      key: walk.animation,
      frames: walk.frames.map((frame) => ({ key: walk.texture, frame: frame.name })),
      frameRate: walk.frameRate,
      repeat: walk.repeat,
    });
  }
  if (attack) {
    addFrames(scene, attack.texture, attack.frames);
    if (!scene.anims.exists(attack.animation)) scene.anims.create({
      key: attack.animation,
      frames: attack.frames.map((frame) => ({ key: attack.texture, frame: frame.name })),
      frameRate: attack.frameRate,
      repeat: attack.repeat,
    });
  }
}
