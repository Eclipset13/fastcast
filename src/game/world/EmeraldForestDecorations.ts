import Phaser from 'phaser';
import { GROUND_Y } from '../config/constants';

export const EMERALD_FOREST_TREE_ASSETS = [
  { key: 'forest-tree-large-a', path: '/assets/biomes/emerald-forest/trees/tree-large-a.png' },
  { key: 'forest-tree-large-b', path: '/assets/biomes/emerald-forest/trees/tree-large-b.png' },
  { key: 'forest-tree-large-c', path: '/assets/biomes/emerald-forest/trees/tree-large-c.png' },
  { key: 'forest-tree-large-d', path: '/assets/biomes/emerald-forest/trees/tree-large-d.png' },
] as const;

export const EMERALD_FOREST_PROP_ASSETS = [
  { key: 'runestone-start', path: '/assets/biomes/emerald-forest/props/runestone-start.png' },
  { key: 'fallen-log-mid', path: '/assets/biomes/emerald-forest/props/fallen-log-mid.png' },
] as const;

type ForestTreeTexture = (typeof EMERALD_FOREST_TREE_ASSETS)[number]['key'];
type ForestPropTexture = (typeof EMERALD_FOREST_PROP_ASSETS)[number]['key'];

interface ForestTreePlacement {
  x: number;
  texture: ForestTreeTexture;
  scale: number;
  depth: number;
  flipX?: boolean;
}

interface ForestPropPlacement {
  x: number;
  y: number;
  texture: ForestPropTexture;
  scale: number;
  depth: number;
}

const TREE_SCALE_MULTIPLIER = 2;

// The first depth band softly fills long sightlines; the second anchors platform clusters.
// All trees remain below terrain art (depth 5) and gameplay entities (depth 20).
const FOREST_TREE_PLACEMENTS: readonly ForestTreePlacement[] = [
  { x: 150, texture: 'forest-tree-large-c', scale: 0.145, depth: 1 },
  { x: 475, texture: 'forest-tree-large-a', scale: 0.16, depth: 3, flipX: true },
  { x: 800, texture: 'forest-tree-large-b', scale: 0.14, depth: 1, flipX: true },
  { x: 1115, texture: 'forest-tree-large-d', scale: 0.17, depth: 3 },
  { x: 1435, texture: 'forest-tree-large-a', scale: 0.14, depth: 1 },
  { x: 1745, texture: 'forest-tree-large-b', scale: 0.16, depth: 3 },
  { x: 2075, texture: 'forest-tree-large-c', scale: 0.15, depth: 1, flipX: true },
  { x: 2400, texture: 'forest-tree-large-d', scale: 0.16, depth: 3, flipX: true },
];

const FOREST_PROP_PLACEMENTS: readonly ForestPropPlacement[] = [
  { x: 58, y: GROUND_Y + 1, texture: 'runestone-start', scale: 0.06, depth: 5 },
  { x: 650, y: 250, texture: 'fallen-log-mid', scale: 0.085, depth: 4 },
];

export const createEmeraldForestTreeDecorations = (scene: Phaser.Scene): Phaser.GameObjects.Image[] => (
  FOREST_TREE_PLACEMENTS.map((placement) => scene.add.image(
    placement.x,
    GROUND_Y + 1,
    placement.texture,
  )
    .setOrigin(0.5, 1)
    .setScale(placement.scale * TREE_SCALE_MULTIPLIER)
    .setDepth(placement.depth)
    .setAlpha(1)
    .setFlipX(placement.flipX ?? false))
);

export type EmeraldForestProps = Record<ForestPropTexture, Phaser.GameObjects.Image>;

export const createEmeraldForestPropDecorations = (scene: Phaser.Scene): EmeraldForestProps => {
  const props = {} as EmeraldForestProps;
  for (const placement of FOREST_PROP_PLACEMENTS) {
    props[placement.texture] = scene.add.image(placement.x, placement.y, placement.texture)
      .setOrigin(0.5, 1)
      .setScale(placement.scale)
      .setDepth(placement.depth);
  }
  return props;
};
