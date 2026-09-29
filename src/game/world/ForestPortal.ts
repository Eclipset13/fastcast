import Phaser from 'phaser';
import { WORLD_WIDTH } from '../config/constants';
import type { Player } from '../entities/Player';

export const FOREST_PORTAL_ASSETS = {
  frame: { key: 'forest-portal-frame', path: '/assets/biomes/emerald-forest/portal/portal-frame-off.png' },
  activeSheet: {
    key: 'forest-portal-active-sheet',
    path: '/assets/biomes/emerald-forest/portal/portal-active-sheet.png',
    frameWidth: 362,
    frameHeight: 543,
    columns: 4,
    frameCount: 8,
    // The second row's artwork sits 8px higher inside its grid cells.
    rowOffsets: [0, -8],
    energyCrop: { x: 106, y: 189, width: 150, height: 264 },
    animation: 'forest-portal-energy',
    frameRate: 10,
  },
} as const;

export const FOREST_PORTAL_POSITION = { x: WORLD_WIDTH - 90, y: 237 } as const;

type PortalState = 'dormant' | 'activating' | 'active';

interface OrbitParticle {
  shape: Phaser.GameObjects.Rectangle;
  angle: number;
  radius: number;
  verticalScale: number;
  speed: number;
  phase: number;
  baseAlpha: number;
  spin: number;
}

const PORTAL_HEIGHT = 202;
const ACTIVATION_DURATION = 1200;
const INTERACTION_RADIUS = 68;
const ENERGY_CENTER_OFFSET_Y = 92;
const GLOW_COLOR = 0x6dc977;
const PARTICLE_COLORS = [0x6dc977, 0x9bdb7a, 0x9ce386, 0xd1f985] as const;

/** Static authored arch plus masked, independently animated energy and interaction. */
export class ForestPortal {
  private state: PortalState = 'dormant';
  private activationStartedAt = 0;
  private activationRuns = 0;
  private nextParticleAt = Infinity;
  private readonly frame: Phaser.GameObjects.Image;
  private readonly activePortal: Phaser.GameObjects.Sprite;
  private readonly innerGlow: Phaser.GameObjects.Ellipse;
  private readonly outerGlow: Phaser.GameObjects.Ellipse;
  private readonly groundGlow: Phaser.GameObjects.Ellipse;
  private readonly maskShape: Phaser.GameObjects.Graphics;
  private readonly openingMask: Phaser.Display.Masks.GeometryMask;
  private readonly prompt: HTMLDivElement;
  private readonly promptHost: HTMLElement;
  private readonly enterKey: Phaser.Input.Keyboard.Key;
  private readonly particles = new Set<Phaser.GameObjects.Rectangle>();
  private readonly orbitParticles: OrbitParticle[] = [];
  private activationPulse?: Phaser.GameObjects.Ellipse;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    readonly x: number,
    readonly y: number,
    private readonly canInteract: () => boolean,
    private readonly onEnter: () => void,
  ) {
    const scale = PORTAL_HEIGHT / this.sourceHeight(FOREST_PORTAL_ASSETS.frame.key);
    this.createActiveAnimation();
    this.outerGlow = scene.add.ellipse(x, y - ENERGY_CENTER_OFFSET_Y, 158, 176, GLOW_COLOR, 0)
      .setDepth(6).setBlendMode(Phaser.BlendModes.ADD);
    this.innerGlow = scene.add.ellipse(x, y - ENERGY_CENTER_OFFSET_Y, 106, 138, GLOW_COLOR, 0.06)
      .setDepth(7).setBlendMode(Phaser.BlendModes.ADD);
    this.groundGlow = scene.add.ellipse(x, y - 5, 166, 34, GLOW_COLOR, 0)
      .setDepth(7).setBlendMode(Phaser.BlendModes.ADD);

    this.maskShape = scene.make.graphics({ x: 0, y: 0 }, false);
    this.maskShape.fillStyle(0xffffff).fillRoundedRect(x - 34, y - 138, 68, 105, { tl: 28, tr: 28, bl: 8, br: 8 });
    this.openingMask = this.maskShape.createGeometryMask();

    this.frame = scene.add.image(x, y, FOREST_PORTAL_ASSETS.frame.key)
      .setOrigin(0.5, 1).setScale(scale).setDepth(10);
    // Only the interior is taken from the sheet. Its stonework and transparent
    // gutters must never replace the grounded, static arch during activation.
    this.activePortal = scene.add.sprite(x, y - 30, FOREST_PORTAL_ASSETS.activeSheet.key, 'energy-0')
      .setOrigin(0.5, 1)
      .setScale(70 / FOREST_PORTAL_ASSETS.activeSheet.energyCrop.width)
      .setDepth(8)
      .setMask(this.openingMask)
      .setAlpha(0)
      .setVisible(false);

    this.enterKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.promptHost = scene.game.canvas.closest<HTMLElement>('.stage') ?? scene.game.canvas.parentElement!;
    this.prompt = document.createElement('div');
    this.prompt.className = 'runestone-prompt portal-prompt';
    this.prompt.textContent = '[E] ENTER';
    this.prompt.hidden = true;
    this.promptHost.append(this.prompt);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  get active(): boolean { return this.state === 'active'; }
  get particleCount(): number { return this.particles.size + this.orbitParticles.length; }
  get activationCount(): number { return this.activationRuns; }

  activate(): void {
    if (this.state !== 'dormant') return;
    this.state = 'activating';
    this.activationRuns += 1;
    this.activationStartedAt = this.scene.time.now;
    this.nextParticleAt = this.activationStartedAt + 170;
    this.activePortal.setVisible(true).setAlpha(0).play(FOREST_PORTAL_ASSETS.activeSheet.animation, true);
    this.createOrbitParticles();
  }

  update(deltaSeconds: number): void {
    const now = this.scene.time.now;
    if (this.state === 'dormant') {
      this.prompt.hidden = true;
      return;
    }

    const pulse = 0.92 + Math.sin(now * 0.0032) * 0.08;
    let energyStrength = 1;

    if (this.state === 'activating') {
      const progress = Phaser.Math.Clamp((now - this.activationStartedAt) / ACTIVATION_DURATION, 0, 1);
      const vortexProgress = Phaser.Math.Easing.Quadratic.Out(Phaser.Math.Clamp((progress - 0.34) / 0.56, 0, 1));
      energyStrength = vortexProgress;
      this.activePortal.setAlpha(vortexProgress * 1.1);
      this.outerGlow.setAlpha(vortexProgress * 0.42).setScale(0.94 + vortexProgress * 0.24);
      this.innerGlow.setAlpha(0.12 + vortexProgress * 0.62).setScale(0.9 + vortexProgress * 0.28);
      this.groundGlow.setAlpha(vortexProgress * 0.68);
      if (progress >= 1) this.finishActivation();
    } else {
      this.activePortal.setAlpha(1 + Math.sin(now * 0.003) * 0.08);
      this.outerGlow.setAlpha(0.46 * pulse).setScale(1.06 + Math.sin(now * 0.0026) * 0.07);
      this.innerGlow.setAlpha(0.82 * pulse).setScale(1.14 + Math.sin(now * 0.0038) * 0.08);
      this.groundGlow.setAlpha(0.7 * pulse);
    }

    this.updateOrbitParticles(deltaSeconds, energyStrength, now);

    if (now >= this.nextParticleAt) {
      this.emitParticle(this.state === 'active');
      this.nextParticleAt = now + (this.state === 'active' ? Phaser.Math.Between(28, 60) : Phaser.Math.Between(80, 120));
    }
    this.updatePrompt();
  }

  private finishActivation(): void {
    this.state = 'active';
    this.nextParticleAt = this.scene.time.now;
    this.activationPulse?.destroy();
    this.activationPulse = this.scene.add.ellipse(this.x, this.y - ENERGY_CENTER_OFFSET_Y, 86, 124)
      .setDepth(12).setStrokeStyle(2, 0x9ce386, 0.7).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: this.activationPulse, scale: 1.32, alpha: 0, duration: 360, ease: 'Sine.easeOut',
      onComplete: () => { this.activationPulse?.destroy(); this.activationPulse = undefined; },
    });
  }

  private createOrbitParticles(): void {
    if (this.orbitParticles.length > 0) return;
    const count = 52;
    for (let index = 0; index < count; index += 1) {
      const color = PARTICLE_COLORS[index % PARTICLE_COLORS.length];
      const size = index % 8 === 0 ? 6 : index % 4 === 0 ? 4 : 2;
      const shape = this.scene.add.rectangle(this.x, this.y - ENERGY_CENTER_OFFSET_Y, size, size, color, 0)
        .setDepth(9)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setMask(this.openingMask);
      this.orbitParticles.push({
        shape,
        angle: (index / count) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.18, 0.18),
        radius: Phaser.Math.FloatBetween(16, 42),
        verticalScale: Phaser.Math.FloatBetween(1.2, 1.8),
        speed: Phaser.Math.FloatBetween(0.5, 1.2),
        phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
        baseAlpha: Phaser.Math.FloatBetween(0.7, 1.1),
        spin: Phaser.Math.FloatBetween(-1.4, 1.4),
      });
    }
  }

  private updateOrbitParticles(deltaSeconds: number, strength: number, now: number): void {
    for (const particle of this.orbitParticles) {
      particle.angle += particle.speed * deltaSeconds * 1.2;
      const radius = particle.radius + Math.sin(now * 0.0022 + particle.phase) * 3.4;
      const x = this.x + Math.cos(particle.angle) * radius;
      const y = this.y - ENERGY_CENTER_OFFSET_Y + Math.sin(particle.angle) * radius * particle.verticalScale;
      const spin = particle.angle + now * 0.0028 * particle.spin;
      particle.shape
        .setPosition(x, y)
        .setRotation(spin)
        .setScale(1 + Math.sin(now * 0.006 + particle.phase) * 0.7)
        .setAlpha(strength * particle.baseAlpha * (0.9 + Math.sin(now * 0.004 + particle.phase) * 0.28));
    }
  }

  private updatePrompt(): void {
    if (this.state !== 'active' || !this.canInteract()) {
      this.prompt.hidden = true;
      return;
    }
    const nearby = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.x, this.y - 18) <= INTERACTION_RADIUS;
    this.prompt.hidden = !nearby;
    if (!nearby) return;
    this.positionPrompt();
    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) this.onEnter();
  }

  private emitParticle(fullStrength: boolean): void {
    const burstCount = fullStrength ? Phaser.Math.Between(14, 26) : Phaser.Math.Between(6, 10);
    for (let index = 0; index < burstCount; index += 1) {
      const angle = Phaser.Math.FloatBetween(-Math.PI, Math.PI);
      const baseX = this.x + Math.cos(angle) * Phaser.Math.Between(8, 30);
      const baseY = this.y - ENERGY_CENTER_OFFSET_Y + Math.sin(angle) * Phaser.Math.Between(10, 42);
      const leaf = Math.random() < 0.28;
      const size = leaf ? { width: 8, height: 3 } : { width: Math.random() < 0.35 ? 5 : 2, height: Math.random() < 0.35 ? 5 : 2 };
      const colorIndex = Math.random() < 0.12 ? 3 : Phaser.Math.Between(0, 2);
      const mote = this.scene.add.rectangle(baseX, baseY, size.width, size.height, PARTICLE_COLORS[colorIndex], fullStrength ? 0.95 : 0.55)
        .setDepth(13)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setRotation(leaf ? Phaser.Math.FloatBetween(-0.6, 0.6) : angle);
      this.particles.add(mote);
      const duration = Phaser.Math.Between(420, 1100);
      const driftX = Math.cos(angle) * Phaser.Math.Between(52, 128);
      const driftY = Math.sin(angle) * Phaser.Math.Between(38, 92) - Phaser.Math.Between(18, 54);
      this.scene.tweens.add({
        targets: mote,
        x: baseX + driftX,
        y: baseY + driftY,
        scale: { from: leaf ? 1.5 : 1, to: 0 },
        rotation: mote.rotation + Phaser.Math.FloatBetween(-2.6, 2.6),
        alpha: { from: fullStrength ? 1 : 0.55, to: 0 },
        duration,
        ease: 'Sine.easeOut',
        onComplete: () => { this.particles.delete(mote); mote.destroy(); },
      });
    }
  }

  private positionPrompt(): void {
    const canvas = this.scene.game.canvas.getBoundingClientRect();
    const host = this.promptHost.getBoundingClientRect();
    const camera = this.scene.cameras.main;
    const screenX = canvas.left - host.left + (this.x - camera.scrollX) * camera.zoom * (canvas.width / camera.width);
    const playerHeadY = this.player.y - 62;
    const screenY = canvas.top - host.top + (playerHeadY - camera.scrollY) * camera.zoom * (canvas.height / camera.height);
    this.prompt.style.left = `${Math.round(screenX - this.prompt.offsetWidth / 2)}px`;
    this.prompt.style.top = `${Math.round(screenY - this.prompt.offsetHeight - 8)}px`;
  }

  private sourceHeight(key: string): number {
    return (this.scene.textures.get(key).getSourceImage() as HTMLImageElement).height;
  }

  private createActiveAnimation(): void {
    const asset = FOREST_PORTAL_ASSETS.activeSheet;
    const texture = this.scene.textures.get(asset.key);
    const crop = asset.energyCrop;
    // Align the energy in both rows to one anchor, excluding the arch/base.
    const frames = Array.from({ length: asset.frameCount }, (_, index) => {
      const name = `energy-${index}`;
      const row = Math.floor(index / asset.columns);
      if (!texture.has(name)) {
        texture.add(name, 0, (index % asset.columns) * asset.frameWidth + crop.x,
          row * asset.frameHeight + crop.y + asset.rowOffsets[row], crop.width, crop.height);
      }
      return { key: asset.key, frame: name };
    });
    if (this.scene.anims.exists(asset.animation)) return;
    this.scene.anims.create({
      key: asset.animation,
      frames,
      frameRate: asset.frameRate,
      repeat: -1,
    });
  }

  destroy(): void {
    this.scene.tweens.killTweensOf([this.activationPulse, ...this.particles]);
    this.activationPulse?.destroy();
    for (const particle of this.particles) particle.destroy();
    this.particles.clear();
    this.prompt.remove();
    this.frame.destroy();
    for (const particle of this.orbitParticles) particle.shape.clearMask(false).destroy();
    this.orbitParticles.length = 0;
    this.activePortal.stop().clearMask(false).destroy();
    this.openingMask.destroy();
    this.innerGlow.destroy();
    this.outerGlow.destroy();
    this.groundGlow.destroy();
    this.maskShape.destroy();
  }
}
