import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GameEvents, events } from '../systems/EventBus';
import { createRunestoneVisuals, SHRINE_DUST_COLORS } from './RunestoneVisuals';

type ShrineState = 'idle' | 'nearby' | 'menuOpen' | 'deactivating';

const INTERACTION_RADIUS = 72;
const SHRINE_EFFECT_DEPTH = 8;

export class RunestoneInteraction {
  private state: ShrineState = 'idle';
  private readonly interactKey: Phaser.Input.Keyboard.Key;
  private readonly runeGlow: Phaser.GameObjects.Image;
  private readonly idleRunes: Phaser.GameObjects.Image;
  private readonly aura: Phaser.GameObjects.Image;
  private readonly prompt: HTMLDivElement;
  private readonly promptHost: HTMLElement;
  private readonly glow = { intensity: 0 };
  private readonly particles = new Set<Phaser.GameObjects.Rectangle>();
  private nextIdleParticleAt = 0;
  private successGlowUntil = 0;
  private deactivationTimer?: Phaser.Time.TimerEvent;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly runestone: Phaser.GameObjects.Image,
    private readonly canOpenMenu: () => boolean,
  ) {
    this.interactKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    const textures = createRunestoneVisuals(scene, runestone);
    const overlay = (key: string, depth: number) => scene.add.image(runestone.x, runestone.y, key)
      .setOrigin(runestone.originX, runestone.originY)
      .setDisplaySize(runestone.displayWidth, runestone.displayHeight)
      .setDepth(depth);
    this.idleRunes = overlay(textures.idle, SHRINE_EFFECT_DEPTH - 1);
    this.runeGlow = overlay(textures.lit, SHRINE_EFFECT_DEPTH).setAlpha(0);
    this.aura = overlay(textures.aura, SHRINE_EFFECT_DEPTH)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);

    this.promptHost = scene.game.canvas.closest<HTMLElement>('.stage') ?? scene.game.canvas.parentElement!;
    this.prompt = document.createElement('div');
    this.prompt.className = 'runestone-prompt';
    this.prompt.textContent = '[E] SPELLCRAFT';
    this.prompt.hidden = true;
    this.promptHost.append(this.prompt);

    events.on(GameEvents.upgradePurchased, this.handleUpgradePurchased);
    events.on(GameEvents.upgradeMenuClosed, this.handleMenuClosed);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  update(): void {
    const insideRange = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.runestone.x,
      this.runeCenterY,
    ) <= INTERACTION_RADIUS;

    if (insideRange && (this.state === 'idle' || this.state === 'deactivating')) this.activate();
    else if (!insideRange && (this.state === 'nearby' || this.state === 'menuOpen')) this.deactivate();

    if (this.state === 'nearby' && this.canOpenMenu() && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.openMenu();
    }

    const active = this.state === 'nearby' || this.state === 'menuOpen';
    const pulse = 0.925 + Math.sin(this.scene.time.now * 0.0022) * 0.075;
    const successBoost = Math.max(0, (this.successGlowUntil - this.scene.time.now) / 500) * 0.3;
    this.runeGlow.setAlpha(this.glow.intensity * Math.min(1, pulse + successBoost));
    this.aura.setAlpha(this.glow.intensity * Math.min(1, pulse * 0.75 + successBoost));
    if (!active) return;
    if (this.state === 'nearby') this.positionPrompt();

    if (this.scene.time.now >= this.nextIdleParticleAt) {
      this.emitIdleParticle();
      this.nextIdleParticleAt = this.scene.time.now + Phaser.Math.Between(280, 520);
    }
  }

  private get runeCenterY(): number {
    return this.runestone.y - this.runestone.displayHeight * 0.52;
  }

  private fadeGlow(intensity: number, duration: number): void {
    this.scene.tweens.killTweensOf(this.glow);
    this.scene.tweens.add({ targets: this.glow, intensity, duration, ease: 'Sine.easeInOut' });
  }

  private activate(): void {
    this.deactivationTimer?.remove(false);
    this.deactivationTimer = undefined;
    this.state = 'nearby';
    this.fadeGlow(1, 180);
    this.prompt.hidden = false;
    this.positionPrompt();
    this.nextIdleParticleAt = this.scene.time.now + 120;
  }

  private deactivate(): void {
    if (this.state === 'deactivating' || this.state === 'idle') return;
    this.state = 'deactivating';
    this.prompt.hidden = true;
    this.fadeGlow(0, 360);
    this.emitBurst(64, true);
    this.deactivationTimer?.remove(false);
    this.deactivationTimer = this.scene.time.delayedCall(180, () => {
      if (this.state === 'deactivating') this.state = 'idle';
      this.deactivationTimer = undefined;
    });
  }

  private openMenu(): void {
    this.state = 'menuOpen';
    this.prompt.hidden = true;
    this.player.setControl(false);
    events.emit(GameEvents.upgradeRequested);
  }

  private readonly handleMenuClosed = (): void => {
    if (this.state !== 'menuOpen') return;
    this.player.setControl(true);
    const stillNearby = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.runestone.x,
      this.runeCenterY,
    ) <= INTERACTION_RADIUS;
    if (stillNearby) this.activate();
    else this.deactivate();
  };

  private readonly handleUpgradePurchased = (): void => {
    if (this.state !== 'menuOpen' && this.state !== 'nearby') return;
    this.successGlowUntil = this.scene.time.now + 500;
    this.emitBurst(14, false);
  };

  private emitIdleParticle(): void {
    const particle = this.createParticle(
      this.runestone.x + Phaser.Math.Between(-10, 10),
      this.runeCenterY + Phaser.Math.Between(-10, 12),
      1,
    );
    this.driftParticle(particle, Phaser.Math.Between(-4, 4), -Phaser.Math.Between(8, 17), Phaser.Math.Between(800, 1200));
  }

  private emitBurst(count: number, large: boolean): void {
    for (let index = 0; index < count; index += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = index % 3 === 0
        ? Phaser.Math.Between(8, 20)
        : Phaser.Math.Between(20, large ? 49 : 28);
      // Mostly one-pixel dust, a few two-pixel points, rare three-pixel glints.
      const size = Phaser.Math.RND.weightedPick([1, 1, 1, 1, 2, 2, 3]);
      const particle = this.createParticle(
        this.runestone.x + Phaser.Math.Between(-8, 8),
        this.runeCenterY + Phaser.Math.Between(-16, 16),
        size,
      );
      this.driftParticle(particle,
        Math.cos(angle) * distance,
        Math.sin(angle) * distance - Phaser.Math.Between(8, 20),
        Phaser.Math.Between(large ? 500 : 450, large ? 1400 : 1000));
    }
  }

  private createParticle(x: number, y: number, size: number): Phaser.GameObjects.Rectangle {
    const particle = this.scene.add.rectangle(Math.round(x), Math.round(y), size, size,
      Phaser.Math.RND.pick(SHRINE_DUST_COLORS), 1)
      .setOrigin(0)
      .setDepth(SHRINE_EFFECT_DEPTH + 1);
    this.particles.add(particle);
    return particle;
  }

  private driftParticle(particle: Phaser.GameObjects.Rectangle, dx: number, dy: number, duration: number): void {
    const startX = particle.x;
    const startY = particle.y;
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration,
      onUpdate: (tween) => {
        const time = tween.getValue() ?? 0;
        const travel = 1 - (1 - time) ** 2;
        particle.setPosition(Math.round(startX + dx * travel), Math.round(startY + dy * travel));
        particle.setAlpha(1 - time * time);
      },
      onComplete: () => { this.particles.delete(particle); particle.destroy(); },
    });
  }

  private positionPrompt(): void {
    const canvasBounds = this.scene.game.canvas.getBoundingClientRect();
    const hostBounds = this.promptHost.getBoundingClientRect();
    const camera = this.scene.cameras.main;
    const worldX = (this.runestone.x - camera.scrollX) * camera.zoom;
    // The authored PNG has transparent padding above the visible stone.
    const visibleStoneTop = this.runestone.y - this.runestone.displayHeight * 0.9;
    const worldY = (visibleStoneTop - 3 - camera.scrollY) * camera.zoom;
    const screenX = canvasBounds.left - hostBounds.left + worldX * (canvasBounds.width / camera.width);
    const screenY = canvasBounds.top - hostBounds.top + worldY * (canvasBounds.height / camera.height);
    this.prompt.style.left = `${Math.round(screenX - this.prompt.offsetWidth / 2)}px`;
    this.prompt.style.top = `${Math.round(screenY - this.prompt.offsetHeight)}px`;
  }

  private destroy(): void {
    events.off(GameEvents.upgradePurchased, this.handleUpgradePurchased);
    events.off(GameEvents.upgradeMenuClosed, this.handleMenuClosed);
    this.deactivationTimer?.remove(false);
    this.player.setControl(true);
    this.scene.tweens.killTweensOf(this.glow);
    this.runeGlow.destroy();
    this.idleRunes.destroy();
    this.aura.destroy();
    this.prompt.remove();
    for (const particle of this.particles) particle.destroy();
    this.particles.clear();
  }
}
