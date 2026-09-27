import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, GROUND_Y, WORLD_WIDTH } from '../config/constants';
import type { BiomeDefinition, BiomeLayerConfig } from '../types';
import { paintForestLayer } from './ForestLayerPainter';

interface RuntimeLayer {
  sprite: Phaser.GameObjects.TileSprite | Phaser.GameObjects.Image | Phaser.GameObjects.Container;
  config: BiomeLayerConfig;
  driftX: number;
  driftY: number;
}

export class BiomeRenderer {
  private readonly runtimeLayers: RuntimeLayer[] = [];
  private readonly motes: Array<{ shape: Phaser.GameObjects.Rectangle; vx: number; vy: number; phase: number }> = [];

  constructor(private readonly scene: Phaser.Scene, private readonly biome: BiomeDefinition) {}

  create(): void {
    this.biome.layers.forEach((layer, index) => {
      if (layer.kind === 'authored' && layer.assetKey) {
        this.createAuthoredLayer(layer);
        return;
      }
      const textureWidth = layer.repeat ? 720 : GAME_WIDTH;
      const key = `biome-${this.biome.id}-${layer.id}`;
      const texture = this.scene.textures.createCanvas(key, textureWidth, GAME_HEIGHT);
      if (!texture) throw new Error(`Could not create texture ${key}`);
      paintForestLayer(texture.context, textureWidth, GAME_HEIGHT, layer, this.biome.palette, 1337 + index * 97);
      texture.refresh();
      const sprite = this.scene.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, key).setOrigin(0).setScrollFactor(0).setDepth(layer.depth);
      sprite.setAlpha(layer.opacity ?? 1);
      if (layer.blendMode === 'ADD') sprite.setBlendMode(Phaser.BlendModes.ADD);
      if (layer.blendMode === 'SCREEN') sprite.setBlendMode(Phaser.BlendModes.SCREEN);
      this.runtimeLayers.push({ sprite, config: layer, driftX: 0, driftY: 0 });
    });
    this.createMotes();
  }

  private createAuthoredLayer(layer: BiomeLayerConfig): void {
    if (layer.repeat) {
      this.createRepeatedAuthoredLayer(layer);
      return;
    }
    const image = this.scene.add.image(0, 0, layer.assetKey!).setOrigin(0).setScrollFactor(0).setDepth(layer.depth);
    const texture = this.scene.textures.get(layer.assetKey!);
    const source = texture.getSourceImage() as HTMLImageElement;
    const heightScale = GAME_HEIGHT / source.height;
    const coverageWidth = GAME_WIDTH + (WORLD_WIDTH - GAME_WIDTH) * layer.parallax;
    image.setDisplaySize(Math.max(source.width * heightScale, coverageWidth), GAME_HEIGHT);
    image.setAlpha(layer.opacity ?? 1);
    this.runtimeLayers.push({ sprite: image, config: layer, driftX: 0, driftY: 0 });
  }

  private createRepeatedAuthoredLayer(layer: BiomeLayerConfig): void {
    const texture = this.scene.textures.get(layer.assetKey!);
    const source = texture.getSourceImage() as HTMLImageElement;
    const scale = (GAME_HEIGHT / source.height) * (layer.scaleMultiplier ?? 1);
    const scaledWidth = source.width * scale;
    const horizontalOverlap = Math.max(1, scaledWidth * (layer.horizontalOverlap ?? 0));
    const stride = scaledWidth - horizontalOverlap;
    const layerY = layer.groundAnchor === undefined
      ? 0
      : GROUND_Y - source.height * layer.groundAnchor * scale;
    const maximumParallaxShift = (WORLD_WIDTH - GAME_WIDTH) * layer.parallax;
    const copyCount = Math.ceil((GAME_WIDTH + maximumParallaxShift) / stride) + 1;
    const copies: Phaser.GameObjects.Image[] = [];

    for (let index = 0; index < copyCount; index += 1) {
      copies.push(
        this.scene.add.image(index * stride, layerY, layer.assetKey!)
          .setOrigin(0)
          .setScale(scale),
      );
    }

    const container = this.scene.add.container(0, 0, copies)
      .setScrollFactor(0)
      .setDepth(layer.depth)
      .setAlpha(layer.opacity ?? 1);
    this.runtimeLayers.push({ sprite: container, config: layer, driftX: 0, driftY: 0 });
  }

  update(deltaSeconds: number): void {
    const cameraX = this.scene.cameras.main.scrollX;
    for (const runtime of this.runtimeLayers) {
      runtime.driftX += (runtime.config.drift?.x ?? 0) * deltaSeconds;
      runtime.driftY += (runtime.config.drift?.y ?? 0) * deltaSeconds;
      if (runtime.sprite instanceof Phaser.GameObjects.TileSprite) {
        runtime.sprite.tilePositionX = cameraX * runtime.config.parallax + runtime.driftX;
        runtime.sprite.tilePositionY = runtime.driftY;
      } else {
        runtime.sprite.x = -cameraX * runtime.config.parallax + runtime.driftX;
        runtime.sprite.y = runtime.driftY;
      }
    }
    for (const mote of this.motes) {
      mote.phase += deltaSeconds;
      mote.shape.x += (mote.vx + Math.sin(mote.phase * 1.8) * 3) * deltaSeconds;
      mote.shape.y += mote.vy * deltaSeconds;
      mote.shape.alpha = 0.28 + (Math.sin(mote.phase * 2.4) + 1) * 0.24;
      if (mote.shape.y < 12) mote.shape.y = GAME_HEIGHT - 18;
      if (mote.shape.x > GAME_WIDTH + 8) mote.shape.x = -8;
      if (mote.shape.x < -8) mote.shape.x = GAME_WIDTH + 8;
    }
  }

  private createMotes(): void {
    const particle = this.biome.particles;
    for (let i = 0; i < particle.count; i += 1) {
      const color = particle.color[i % particle.color.length];
      const size = i % 7 === 0 ? 2 : 1;
      const shape = this.scene.add.rectangle(
        Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(22, GAME_HEIGHT - 20), size, size, color,
      ).setScrollFactor(0).setDepth(75);
      if (particle.blendMode === 'ADD') shape.setBlendMode(Phaser.BlendModes.ADD);
      this.motes.push({
        shape,
        vx: Phaser.Math.FloatBetween(...particle.speedX),
        vy: Phaser.Math.FloatBetween(...particle.speedY),
        phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      });
    }
  }
}
