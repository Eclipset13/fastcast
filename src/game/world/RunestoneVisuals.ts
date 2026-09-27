import Phaser from 'phaser';

export const SHRINE_DUST_COLORS = [0xd1f985, 0xd1f985, 0x9ce386, 0x9bdb7a, 0x6dc977];

/** Derive aligned effect masks from the authored rune pixels, once per texture size. */
export function createRunestoneVisuals(scene: Phaser.Scene, stone: Phaser.GameObjects.Image) {
  const width = Math.round(stone.displayWidth);
  const height = Math.round(stone.displayHeight);
  const prefix = `${stone.texture.key}-runes-${width}x${height}`;
  const keys = { idle: `${prefix}-idle`, lit: `${prefix}-lit`, aura: `${prefix}-aura` };
  if (scene.textures.exists(keys.idle)) return keys;

  // Keep the rune masks at source resolution so their edges exactly match the PNG.
  // Only the narrow aura is built at native game-pixel resolution.
  const artwork = stone.texture.getSourceImage() as HTMLImageElement;
  const source = document.createElement('canvas');
  source.width = artwork.width;
  source.height = artwork.height;
  const context = source.getContext('2d', { willReadFrequently: true })!;
  context.imageSmoothingEnabled = false;
  context.drawImage(artwork, 0, 0);
  const pixels = context.getImageData(0, 0, source.width, source.height).data;
  const idle = scene.textures.createCanvas(keys.idle, source.width, source.height)!;
  const lit = scene.textures.createCanvas(keys.lit, source.width, source.height)!;
  const aura = scene.textures.createCanvas(keys.aura, width, height)!;
  idle.context.fillStyle = '#0f443d';
  lit.context.fillStyle = '#d1f985';
  for (let y = Math.floor(source.height * 0.28); y < source.height * 0.78; y += 1) {
    for (let x = Math.floor(source.width * 0.40); x < source.width * 0.635; x += 1) {
      const index = (y * source.width + x) * 4;
      const r = pixels[index], g = pixels[index + 1], b = pixels[index + 2], a = pixels[index + 3];
      // Restrict extraction to the carved face, excluding the moss-covered rim.
      if (a > 160 && r > 135 && g > 165 && r > b * 1.2 && g > b * 1.15) {
        idle.context.fillRect(x, y, 1, 1);
        lit.context.fillRect(x, y, 1, 1);
      }
    }
  }
  source.width = width;
  source.height = height;
  context.imageSmoothingEnabled = false;
  context.drawImage(lit.canvas, 0, 0, width, height);
  const nativePixels = context.getImageData(0, 0, width, height).data;
  const mask = new Set<number>();
  for (let index = 3; index < nativePixels.length; index += 4) {
    if (nativePixels[index] > 0) mask.add((index - 3) / 4);
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mask.has(y * width + x)) continue;
      let distance = 3;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height && mask.has(ny * width + nx)) {
            distance = Math.min(distance, Math.abs(dx) + Math.abs(dy));
          }
        }
      }
      if (distance > 2) continue;
      aura.context.fillStyle = distance === 1 ? 'rgba(156,227,134,0.36)' : 'rgba(109,201,119,0.10)';
      aura.context.fillRect(x, y, 1, 1);
    }
  }
  for (const texture of [idle, lit, aura]) {
    texture.refresh();
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  return keys;
}
