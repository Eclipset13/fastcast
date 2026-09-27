import type { BiomeDefinition, BiomeId } from '../types';

const forestParallax = { far: 0.08, mid: 0.28, near: 0.55 } as const;

const forest: BiomeDefinition = {
  id: 'forest', name: 'Emerald Forest', status: 'complete',
  palette: { skyTop: 0x123d31, skyBottom: 0x4a9468, haze: 0xa2e2ad, far: 0x3a7c59, middle: 0x286647, near: 0x174a31, ground: 0x326546, groundDark: 0x183a29, grass: 0x78ce78, accent: 0xfff2a0 },
  layers: [
    { id: 'far', kind: 'authored', assetKey: 'forest-bg-far', depth: -120, parallax: forestParallax.far, repeat: false },
    { id: 'mid', kind: 'authored', assetKey: 'forest-bg-mid', depth: -110, parallax: forestParallax.mid, repeat: true },
    { id: 'near', kind: 'authored', assetKey: 'forest-bg-near', depth: -100, parallax: forestParallax.near, repeat: true, scaleMultiplier: 1, horizontalOverlap: 0.15, groundAnchor: 0.85 },
  ],
  particles: { color: [0xf2ee9d, 0x9dffc7, 0xffffff], count: 42, speedX: [-4, 7], speedY: [-10, -2], blendMode: 'ADD' },
};

const scaffold = (id: Exclude<BiomeId, 'forest'>, name: string, colors: number[]): BiomeDefinition => ({
  id, name, status: 'scaffold',
  palette: { skyTop: colors[0], skyBottom: colors[1], haze: colors[2], far: colors[3], middle: colors[4], near: colors[5], ground: colors[5], groundDark: colors[0], grass: colors[2], accent: colors[2] },
  layers: [
    { id: 'sky', kind: 'gradient', depth: -100, parallax: 0, repeat: false },
    { id: 'far-silhouette', kind: 'trees', depth: -80, parallax: 0.12, repeat: true },
    { id: 'midground', kind: 'trees', depth: -55, parallax: 0.42, repeat: true },
    { id: 'atmosphere', kind: 'fog', depth: -40, parallax: 0.55, repeat: true, drift: { x: 1, y: 0 }, opacity: 0.14 },
    { id: 'foreground', kind: 'foreground', depth: 90, parallax: 1.08, repeat: true },
  ],
  particles: { color: [colors[2]], count: 24, speedX: [-3, 3], speedY: [-5, 1], blendMode: 'NORMAL' },
});

export const BIOMES: Record<BiomeId, BiomeDefinition> = {
  forest,
  cave: scaffold('cave', 'Hollow Caverns', [0x241a14, 0xad754c, 0xe7be7d, 0x76543c, 0x493425, 0x241a14]),
  crystal: scaffold('crystal', 'Luminous Grotto', [0x080b24, 0x28285f, 0xa88cff, 0x35366e, 0x242554, 0x11142f]),
  deadwood: scaffold('deadwood', 'Duskwood', [0x1c0c2b, 0x9e356f, 0xff79ad, 0x6a235d, 0x391342, 0x1b0925]),
  sakura: scaffold('sakura', 'Garden of Stillness', [0x123a36, 0x3b7366, 0xf1a8ca, 0x27594f, 0x1b453f, 0x102f2b]),
  arena: scaffold('arena', 'Crimson Threshold', [0x1b080b, 0xa51f31, 0xff8c66, 0x711927, 0x381016, 0x18070a]),
};
