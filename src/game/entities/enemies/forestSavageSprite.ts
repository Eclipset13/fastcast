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
  frameRate: 10,
  // The authored swing makes contact on the sixth pose (zero-based frame 5).
  impactFrame: 5,
} as const;

const FRAME_COUNT = 8;
const ALPHA_THRESHOLD = 10;
const DISPLAY_HEIGHT = 46;

interface DetectedFrame extends EnemyVisualFrame {
  pixels: number;
}

export function preloadForestSavage(scene: Phaser.Scene): void {
  scene.load.image(FOREST_SAVAGE_IDLE.key, FOREST_SAVAGE_IDLE.path);
  scene.load.image(FOREST_SAVAGE_WALK.key, FOREST_SAVAGE_WALK.path);
  scene.load.image(FOREST_SAVAGE_ATTACK.key, FOREST_SAVAGE_ATTACK.path);
}

/**
 * Finds the actual opaque character islands in an authored sheet instead of cutting
 * it into equal cells. AI-authored sprite sheets often let a horn/club cross an
 * imaginary cell boundary; equal slicing is what caused pieces of the neighbouring
 * pose to appear behind Forest Savage in-game.
 */
function detectFrames(scene: Phaser.Scene, textureKey: string, prefix: string, expected: number): DetectedFrame[] {
  const texture = scene.textures.get(textureKey);
  const source = texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const width = source.width;
  const height = source.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return fallbackGrid(scene, textureKey, prefix, expected, width, height);
  context.clearRect(0, 0, width, height);
  context.drawImage(source, 0, 0);
  const alpha = context.getImageData(0, 0, width, height).data;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const components: Array<{ minX: number; minY: number; maxX: number; maxY: number; pixels: number }> = [];

  const opaque = (index: number) => alpha[index * 4 + 3] > ALPHA_THRESHOLD;
  for (let start = 0; start < visited.length; start += 1) {
    if (visited[start] || !opaque(start)) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    visited[start] = 1;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let pixels = 0;

    while (head < tail) {
      const index = queue[head++];
      const x = index % width;
      const y = Math.floor(index / width);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      pixels += 1;

      for (let dy = -1; dy <= 1; dy += 1) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          const next = ny * width + nx;
          if (visited[next] || !opaque(next)) continue;
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
    }

    // Tiny isolated antialias/spark pixels are not animation frames.
    if (pixels > 120) components.push({ minX, minY, maxX, maxY, pixels });
  }

  const selected = components.sort((a, b) => b.pixels - a.pixels).slice(0, expected);
  if (selected.length !== expected) return fallbackGrid(scene, textureKey, prefix, expected, width, height);

  // Discover rows from the component centres. This supports both 4x2 sheets and
  // single-row attack sheets without hard-coding the source image dimensions.
  const byY = [...selected].sort((a, b) => centreY(a) - centreY(b));
  const rows: typeof selected[] = [];
  const rowGap = height * 0.18;
  for (const component of byY) {
    const last = rows.at(-1);
    if (!last || Math.abs(centreY(component) - averageCentreY(last)) > rowGap) rows.push([component]);
    else last.push(component);
  }
  const ordered = rows.flatMap((row) => row.sort((a, b) => centreX(a) - centreX(b)));

  return ordered.map((component, index) => {
    const x = component.minX;
    const y = component.minY;
    const frameWidth = component.maxX - component.minX + 1;
    const frameHeight = component.maxY - component.minY + 1;
    const footY = frameHeight;
    const bandTop = component.maxY - Math.max(8, Math.round(frameHeight * 0.22));
    let minFootX = component.maxX;
    let maxFootX = component.minX;
    for (let py = Math.max(component.minY, bandTop); py <= component.maxY; py += 1) {
      for (let px = component.minX; px <= component.maxX; px += 1) {
        if (alpha[(py * width + px) * 4 + 3] <= ALPHA_THRESHOLD) continue;
        minFootX = Math.min(minFootX, px);
        maxFootX = Math.max(maxFootX, px);
      }
    }
    const anchorX = ((minFootX + maxFootX) / 2) - component.minX;
    const name = `${prefix}-${index}`;
    if (!texture.has(name)) texture.add(name, 0, x, y, frameWidth, frameHeight);
    return { name, x, y, width: frameWidth, height: frameHeight, anchorX, footY, pixels: component.pixels };
  });
}

function centreX(component: { minX: number; maxX: number }): number {
  return (component.minX + component.maxX) / 2;
}

function centreY(component: { minY: number; maxY: number }): number {
  return (component.minY + component.maxY) / 2;
}

function averageCentreY(row: Array<{ minY: number; maxY: number }>): number {
  return row.reduce((sum, component) => sum + centreY(component), 0) / row.length;
}

function fallbackGrid(scene: Phaser.Scene, textureKey: string, prefix: string, expected: number,
  width: number, height: number): DetectedFrame[] {
  const texture = scene.textures.get(textureKey);
  const columns = width / height > 2.4 ? expected : Math.min(4, expected);
  const rows = Math.ceil(expected / columns);
  const cellWidth = Math.floor(width / columns);
  const cellHeight = Math.floor(height / rows);
  return Array.from({ length: expected }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = column * cellWidth;
    const y = row * cellHeight;
    const frameWidth = column === columns - 1 ? width - x : cellWidth;
    const frameHeight = row === rows - 1 ? height - y : cellHeight;
    const name = `${prefix}-${index}`;
    if (!texture.has(name)) texture.add(name, 0, x, y, frameWidth, frameHeight);
    return {
      name, x, y, width: frameWidth, height: frameHeight,
      anchorX: frameWidth / 2, footY: frameHeight, pixels: frameWidth * frameHeight,
    };
  });
}

function median(values: number[]): number {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function animationScale(frames: readonly EnemyVisualFrame[]): number {
  return DISPLAY_HEIGHT / Math.max(1, median(frames.map((frame) => frame.height)));
}

export function createForestSavageAnimations(scene: Phaser.Scene): EnemyVisualConfig {
  const idleFrames = detectFrames(scene, FOREST_SAVAGE_IDLE.key, 'idle', 1);
  const walkFrames = detectFrames(scene, FOREST_SAVAGE_WALK.key, 'walk', FRAME_COUNT);
  const attackFrames = detectFrames(scene, FOREST_SAVAGE_ATTACK.key, 'attack', FRAME_COUNT);
  const idle = idleFrames[0];

  if (!scene.anims.exists(FOREST_SAVAGE_WALK.animation)) scene.anims.create({
    key: FOREST_SAVAGE_WALK.animation,
    frames: walkFrames.map((frame) => ({ key: FOREST_SAVAGE_WALK.key, frame: frame.name })),
    frameRate: FOREST_SAVAGE_WALK.frameRate,
    repeat: -1,
  });
  if (!scene.anims.exists(FOREST_SAVAGE_ATTACK.animation)) scene.anims.create({
    key: FOREST_SAVAGE_ATTACK.animation,
    frames: attackFrames.map((frame) => ({ key: FOREST_SAVAGE_ATTACK.key, frame: frame.name })),
    frameRate: FOREST_SAVAGE_ATTACK.frameRate,
    repeat: 0,
  });

  return {
    idle: { texture: FOREST_SAVAGE_IDLE.key, scale: DISPLAY_HEIGHT / idle.height, frame: idle },
    walk: {
      texture: FOREST_SAVAGE_WALK.key,
      animation: FOREST_SAVAGE_WALK.animation,
      frameRate: FOREST_SAVAGE_WALK.frameRate,
      scale: animationScale(walkFrames),
      frames: walkFrames,
      repeat: -1,
    },
    attack: {
      texture: FOREST_SAVAGE_ATTACK.key,
      animation: FOREST_SAVAGE_ATTACK.animation,
      frameRate: FOREST_SAVAGE_ATTACK.frameRate,
      scale: animationScale(attackFrames),
      frames: attackFrames,
      repeat: 0,
      impactFrame: Math.min(FOREST_SAVAGE_ATTACK.impactFrame, attackFrames.length - 1),
    },
    body: { width: 18, height: 30 },
    sourceFaces: 'right',
  };
}
