import type { BiomeLayerConfig, BiomePalette } from '../types';
import { seededRandom } from './SeededRandom';

const hex = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;
const rgba = (color: number, alpha: number): string => {
  const red = color >> 16;
  const green = (color >> 8) & 255;
  const blue = color & 255;
  return `rgba(${red},${green},${blue},${alpha})`;
};

export function paintForestLayer(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  layer: BiomeLayerConfig,
  palette: BiomePalette,
  seed: number,
): void {
  const random = seededRandom(seed);
  context.clearRect(0, 0, width, height);
  context.imageSmoothingEnabled = false;

  if (layer.kind === 'gradient') {
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, hex(palette.skyTop));
    gradient.addColorStop(0.58, hex(palette.skyBottom));
    gradient.addColorStop(1, hex(palette.near));
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.fillStyle = rgba(palette.haze, 0.08);
    for (let y = 82; y < 205; y += 7) context.fillRect(0, y, width, 2);
    return;
  }

  if (layer.kind === 'canopy') {
    context.fillStyle = hex(palette.far);
    for (let i = 0; i < 85; i += 1) {
      const x = Math.floor(random() * width);
      const y = Math.floor(random() * 72) - 18;
      const size = 10 + Math.floor(random() * 22);
      context.fillRect(x, y, size, size / 2);
      context.fillRect(x + size / 4, y - size / 4, size / 2, size);
    }
    context.fillStyle = rgba(palette.haze, 0.11);
    for (let i = 0; i < 22; i += 1) context.fillRect(Math.floor(random() * width), 35 + Math.floor(random() * 55), 2, 2);
    return;
  }

  if (layer.kind === 'trees') {
    const far = layer.parallax < 0.2;
    const base = far ? palette.far : palette.middle;
    const count = far ? 17 : 12;
    for (let i = 0; i < count; i += 1) {
      const x = Math.floor((i / count) * width + random() * 34);
      const trunkWidth = far ? 7 + Math.floor(random() * 7) : 12 + Math.floor(random() * 12);
      const top = far ? 42 + Math.floor(random() * 42) : 15 + Math.floor(random() * 54);
      context.fillStyle = hex(base);
      context.fillRect(x, top, trunkWidth, 225 - top);
      context.fillStyle = rgba(palette.haze, far ? 0.08 : 0.05);
      context.fillRect(x + 2, top, 2, 225 - top);
      context.fillStyle = hex(base);
      for (let branch = 0; branch < 4; branch += 1) {
        const by = top + 25 + branch * 29 + Math.floor(random() * 12);
        const direction = branch % 2 === 0 ? -1 : 1;
        context.save();
        context.translate(x + trunkWidth / 2, by);
        context.rotate(direction * (0.32 + random() * 0.22));
        context.fillRect(direction < 0 ? -32 : 0, 0, 34, far ? 3 : 5);
        context.restore();
      }
      if (!far) {
        context.fillStyle = rgba(palette.grass, 0.25);
        context.fillRect(x + trunkWidth - 3, top + 35, 2, 28);
        context.fillRect(x - 1, top + 112, 2, 20);
      }
    }
    return;
  }

  if (layer.kind === 'shafts') {
    context.fillStyle = rgba(palette.accent, 0.42);
    for (let i = 0; i < 6; i += 1) {
      const x = 24 + i * 142 + Math.floor(random() * 42);
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x + 14, 0);
      context.lineTo(x + 88, height);
      context.lineTo(x + 45, height);
      context.closePath();
      context.fill();
    }
    return;
  }

  if (layer.kind === 'fog') {
    for (let i = 0; i < 18; i += 1) {
      const x = Math.floor(random() * width);
      const y = 152 + Math.floor(random() * 70);
      const cloudWidth = 50 + Math.floor(random() * 90);
      context.fillStyle = rgba(palette.haze, 0.2 + random() * 0.12);
      context.fillRect(x, y, cloudWidth, 3 + Math.floor(random() * 5));
      context.fillRect(x + 18, y - 4, cloudWidth * 0.6, 4);
    }
    return;
  }

  if (layer.kind === 'undergrowth') {
    for (let i = 0; i < 80; i += 1) {
      const x = Math.floor(random() * width);
      const y = 208 + Math.floor(random() * 20);
      const size = 3 + Math.floor(random() * 8);
      context.fillStyle = i % 4 === 0 ? hex(palette.grass) : hex(palette.near);
      context.fillRect(x, y, size, 228 - y);
      if (i % 5 === 0) context.fillRect(x - 3, y + 3, size + 6, 3);
    }
    context.fillStyle = rgba(palette.accent, 0.7);
    for (let i = 0; i < 20; i += 1) context.fillRect(Math.floor(random() * width), 216 + Math.floor(random() * 9), 1, 2);
    return;
  }

  if (layer.kind === 'foreground') {
    context.fillStyle = hex(palette.groundDark);
    for (let i = 0; i < 4; i += 1) {
      const x = i * 220 + Math.floor(random() * 70) - 45;
      const widthAtBase = 24 + Math.floor(random() * 28);
      context.fillRect(x, 0, widthAtBase, 78 + Math.floor(random() * 55));
      context.fillRect(x + widthAtBase - 4, 34, 48 + Math.floor(random() * 42), 6);
    }
    for (let i = 0; i < 24; i += 1) {
      const x = Math.floor(random() * width);
      const fromBottom = Math.floor(random() * 18);
      context.fillRect(x, height - fromBottom, 2 + Math.floor(random() * 5), fromBottom);
    }
  }
}
