import Phaser from 'phaser';
import { COMBAT_TUNING } from '../config/constants';
import type { Player } from '../entities/Player';
import type { Enemy } from '../entities/Enemy';
import type { AbilityDefinition } from '../types';

/** Camera and cosmetic effects only: no damage callbacks or combat rules. */
export class BattlePresentation {
  private readonly effects = new Set<Phaser.GameObjects.GameObject>();
  private readonly timers = new Set<Phaser.Time.TimerEvent>();
  private transition?: Phaser.Tweens.Tween;
  private saved?: { zoom: number; offsetX: number; offsetY: number; lerpX: number; lerpY: number; bounds: boolean };
  private enemy?: Enemy;
  private tracking = false;
  private impactTimer?: Phaser.Time.TimerEvent;
  private normalTweenSpeed = 1;
  private readonly view = { x: 0, y: 0, zoom: 1 };

  constructor(private readonly scene: Phaser.Scene, private readonly player: Player) {}

  enter(enemy: Enemy): void {
    this.clearEffects();
    this.enemy = enemy;
    const camera = this.scene.cameras.main;
    this.saved = { zoom: camera.zoom, offsetX: camera.followOffset.x, offsetY: camera.followOffset.y,
      lerpX: camera.lerp.x, lerpY: camera.lerp.y, bounds: camera.useBounds };
    camera.stopFollow();
    camera.useBounds = false;
    this.view.x = camera.worldView.centerX;
    this.view.y = camera.worldView.centerY;
    this.view.zoom = camera.zoom;
    this.tracking = false;
    this.transition = this.scene.tweens.add({
      targets: this.view, ...this.composition(), duration: COMBAT_TUNING.cameraDuration, ease: 'Sine.easeInOut',
      onUpdate: () => this.applyView(), onComplete: () => { this.tracking = true; },
    });
  }

  private composition(): { x: number; y: number; zoom: number } {
    const camera = this.scene.cameras.main;
    const canvas = this.scene.game.canvas.getBoundingClientRect();
    const host = this.scene.game.canvas.closest('.stage')!.getBoundingClientRect();
    // ENVELOP can crop the canvas on narrow screens. Fit the visible part, not all 480 pixels.
    const visibleWidth = camera.width * Math.min(1, host.width / canvas.width);
    const visibleHeight = camera.height * Math.min(1, host.height / canvas.height);
    const spacing = Math.abs(this.player.x - this.enemy!.x);
    const zoom = Math.min(1.38, visibleWidth / (spacing + 110));
    const feet = Math.max(this.player.y, this.enemy!.y) + 14;
    return { x: (this.player.x + this.enemy!.x) / 2, y: feet - visibleHeight * 0.27 / zoom, zoom };
  }

  update(): void {
    if (!this.tracking || !this.enemy) return;
    Object.assign(this.view, this.composition());
    this.applyView();
  }

  private applyView(): void {
    this.scene.cameras.main.setZoom(this.view.zoom).centerOn(this.view.x, this.view.y);
  }

  exit(done: () => void): void {
    this.tracking = false;
    this.transition?.stop();
    const saved = this.saved;
    if (!saved) { done(); return; }
    const camera = this.scene.cameras.main;
    // Clamp the destination exactly as the exploration camera would, before restoring follow.
    const bounds = camera.getBounds();
    const halfW = camera.width / saved.zoom / 2;
    const halfH = camera.height / saved.zoom / 2;
    const targetX = this.player.x - saved.offsetX;
    const targetY = this.player.y - saved.offsetY;
    const x = saved.bounds ? Phaser.Math.Clamp(targetX, bounds.left + halfW, bounds.right - halfW) : targetX;
    const y = saved.bounds ? Phaser.Math.Clamp(targetY, bounds.top + halfH, bounds.bottom - halfH) : targetY;
    this.transition = this.scene.tweens.add({
      targets: this.view, x, y, zoom: saved.zoom, duration: COMBAT_TUNING.cameraDuration, ease: 'Sine.easeInOut',
      onUpdate: () => this.applyView(),
      onComplete: () => {
        camera.useBounds = saved.bounds;
        camera.startFollow(this.player, true, saved.lerpX, saved.lerpY, saved.offsetX, saved.offsetY);
        this.clearEffects();
        this.player.clearTint();
        this.enemy?.clearTint();
        this.enemy = undefined;
        done();
      },
    });
  }

  private keep<T extends Phaser.GameObjects.GameObject>(effect: T): T {
    this.effects.add(effect);
    effect.once('destroy', () => this.effects.delete(effect));
    return effect;
  }

  private later(delay: number, callback: () => void): void {
    const timer = this.scene.time.delayedCall(delay, () => { this.timers.delete(timer); callback(); });
    this.timers.add(timer);
  }

  private burst(x: number, y: number, color: number, count = 12, radius = 22): void {
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2 + Math.random() * 0.3;
      const pixel = this.keep(this.scene.add.rectangle(x, y, i % 3 ? 1 : 2, i % 3 ? 1 : 2, color).setDepth(48));
      this.scene.tweens.add({ targets: pixel, x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius,
        alpha: 0, duration: 200 + Math.random() * 180, ease: 'Cubic.easeOut', onComplete: () => pixel.destroy() });
    }
  }

  private halo(x: number, y: number, color: number, radius = 22): void {
    const circle = this.keep(this.scene.add.circle(x, y, radius, color, 0.08).setStrokeStyle(1.5, color).setDepth(44));
    this.scene.tweens.add({ targets: circle, scale: { from: 0.4, to: 1.25 }, alpha: 0,
      duration: 360, ease: 'Quad.easeOut', onComplete: () => circle.destroy() });
    this.burst(x, y, color, 14, radius);
  }

  cast(ability: AbilityDefinition, enemy: Enemy): void {
    const color = ability.color;
    const powerful = ['judgment', 'nova', 'soulflame'].includes(ability.id);
    this.burst(this.player.x, this.player.y - 10, color, 8, 12);
    if (['heal', 'guard', 'focus'].includes(ability.kind) || ability.id === 'ascend') {
      this.halo(this.player.x, this.player.y - 6, color);
      return;
    }
    if (ability.kind === 'utility') { this.halo(enemy.x, enemy.y - 6, color); return; }
    if (ability.kind === 'hybrid') this.halo(this.player.x, this.player.y - 6, color);
    const hit = () => {
      this.halo(enemy.x, enemy.y - 8, color, powerful ? 27 : 18);
      if (enemy.active) {
        enemy.setTintFill(0xffffff);
        this.later(85, () => { if (enemy.active) enemy.clearTint(); });
      }
      this.scene.cameras.main.shake(powerful ? 100 : 65, powerful ? 0.0035 : 0.0018);
    };
    if (ability.kind === 'melee') {
      const slash = this.keep(this.scene.add.rectangle(enemy.x, enemy.y - 9, 3, 34, color).setDepth(45).setRotation(-0.7));
      this.scene.tweens.add({ targets: slash, scaleX: 0, alpha: 0, duration: 190, onComplete: () => slash.destroy() });
      hit();
    } else {
      const orb = this.keep(this.scene.add.image(this.player.x, this.player.y - 10, 'spell-orb')
        .setDepth(45).setTint(color).setScale(powerful ? 1.3 : 0.9));
      let trailAt = 0;
      this.scene.tweens.add({ targets: orb, x: enemy.x, y: enemy.y - 8, duration: 160, ease: 'Quad.easeIn',
        onUpdate: () => {
          if (this.scene.time.now > trailAt) { this.burst(orb.x, orb.y, color, 2, 5); trailAt = this.scene.time.now + 25; }
        }, onComplete: () => { orb.destroy(); hit(); } });
    }
  }

  damage(amount: number, critical: boolean): void {
    this.player.setTintFill(0xff415b);
    this.later(130, () => this.player.clearTint());
    this.burst(this.player.x, this.player.y - 7, 0xff3f58, critical ? 22 : 12, critical ? 29 : 18);
    this.scene.cameras.main.shake(critical ? 160 : 95, critical ? 0.007 : 0.0035);
    this.floatText(this.player.x, this.player.y - 26, '-' + amount, 0xff5063);
    if (critical && this.enemy) {
      const strike = this.keep(this.scene.add.line(0, 0, this.enemy.x, this.enemy.y - 10,
        this.player.x, this.player.y - 7, 0xff5163).setOrigin(0).setLineWidth(1).setDepth(43));
      this.scene.tweens.add({ targets: strike, alpha: 0, duration: 100, delay: 60, onComplete: () => strike.destroy() });
      this.hitPause();
    }
  }

  parry(): void {
    this.halo(this.player.x, this.player.y - 5, 0xb9faff, 25);
    this.player.setTintFill(0xd9ffff);
    this.later(65, () => this.player.clearTint());
    this.scene.cameras.main.shake(65, 0.002);
    this.hitPause();
  }

  private hitPause(): void {
    if (!this.impactTimer) this.normalTweenSpeed = this.scene.tweens.timeScale;
    this.impactTimer?.remove(false);
    this.scene.tweens.timeScale = 0.05;
    this.impactTimer = this.scene.time.delayedCall(65, () => {
      this.scene.tweens.timeScale = this.normalTweenSpeed;
      this.impactTimer = undefined;
    });
  }

  death(enemy: Enemy): void {
    const ghost = this.keep(this.scene.add.image(enemy.x, enemy.y, enemy.texture.key).setDepth(25).setTint(0xc8fff0));
    this.burst(enemy.x, enemy.y - 6, enemy.definition.accent, 24, 32);
    this.scene.tweens.add({ targets: ghost, alpha: 0, y: enemy.y - 12, scaleY: 0.3, duration: 290, onComplete: () => ghost.destroy() });
  }

  floatText(x: number, y: number, text: string, color: number): void {
    const label = this.keep(this.scene.add.text(x, y, text, { fontFamily: 'Silkscreen, monospace', fontSize: '8px',
      color: '#' + color.toString(16).padStart(6, '0'), stroke: '#071019', strokeThickness: 2 }).setOrigin(0.5).setDepth(60));
    this.scene.tweens.add({ targets: label, y: y - 15, alpha: 0, duration: 650, onComplete: () => label.destroy() });
  }

  private clearEffects(): void {
    if (this.impactTimer) {
      this.impactTimer.remove(false);
      this.impactTimer = undefined;
      this.scene.tweens.timeScale = this.normalTweenSpeed;
    }
    for (const timer of this.timers) timer.remove(false);
    this.timers.clear();
    for (const effect of this.effects) { this.scene.tweens.killTweensOf(effect); effect.destroy(); }
    this.effects.clear();
  }

  destroy(): void {
    this.tracking = false;
    this.transition?.stop();
    this.clearEffects();
  }
}
