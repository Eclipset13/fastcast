import Phaser from 'phaser';
import type { EnemyDefinition } from '../types';
import type { EnemyVisualAnimation, EnemyVisualConfig, EnemyVisualFrame, EnemyVisualPose } from './enemies/EnemyVisualConfig';

type EnemyVisualState = 'idle' | 'walking' | 'attacking' | 'dead';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  hp: number;
  defeated = false;
  combatLocked = false;
  private direction = -1;
  private readonly homeX: number;
  private visualState: EnemyVisualState = 'idle';
  private attackStartTimer?: Phaser.Time.TimerEvent;
  private attackImpactTimer?: Phaser.Time.TimerEvent;
  private attackCompleteHandler?: () => void;
  private attackImpactCallback?: () => void;
  private attackImpactFrameName?: string;
  private hurtTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly definition: EnemyDefinition,
    private readonly visual?: EnemyVisualConfig) {
    super(scene, x, y, visual?.idle.texture ?? `enemy-${definition.id}`,
      visual?.idle.frame?.name === '__BASE' ? undefined : visual?.idle.frame?.name);
    scene.add.existing(this); scene.physics.add.existing(this);
    this.homeX = x; this.hp = definition.hp;
    this.setDepth(20).setCollideWorldBounds(true);
    this.on(Phaser.Animations.Events.ANIMATION_UPDATE, this.handleAnimationFrame, this);
    if (visual) this.applyPose(visual.idle);
    else {
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setSize(18, 30).setOffset(3, 4);
    }
  }

  update(): void {
    if (this.defeated || this.combatLocked || !this.body?.enable) return;
    if (this.x < this.homeX - 45) this.direction = 1;
    if (this.x > this.homeX + 45) this.direction = -1;
    this.setVelocityX(this.direction * 20);
    this.faceDirection(this.direction);
    if (Math.abs((this.body as Phaser.Physics.Arcade.Body).velocity.x) > 1) this.showWalk();
    else this.showIdle();
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    if (!this.active || this.defeated) return;
    this.hurtTimer?.remove(false);
    this.setTintFill(0xffffff);
    this.hurtTimer = this.scene.time.delayedCall(80, () => {
      this.hurtTimer = undefined;
      if (this.active) this.clearTint();
    });
  }

  setCombatLocked(locked: boolean, playerX: number): void {
    this.combatLocked = locked;
    this.setVelocity(0, 0);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(!locked);
    body.moves = !locked;
    if (locked) {
      this.showIdle();
      this.faceDirection(playerX < this.x ? -1 : 1);
    } else {
      this.cancelAttack();
      this.showIdle();
    }
  }

  /** Starts the wind-up so the authored impact pose, not a detached timer, lands on impactAt. */
  prepareAttack(impactAt: number, onImpact: () => void): void {
    if (this.defeated || this.visualState === 'attacking') return;
    const attack = this.visual?.attack;
    this.visualState = 'attacking';
    this.anims.stop();

    if (!attack) {
      this.attackImpactTimer = this.scene.time.delayedCall(Math.max(0, impactAt - this.scene.time.now), () => {
        this.attackImpactTimer = undefined;
        if (!this.defeated) onImpact();
      });
      return;
    }

    this.applyAnimationFrame(attack, 0);
    const impactFrame = Phaser.Math.Clamp(
      attack.impactFrame ?? Math.floor(attack.frames.length / 2),
      0,
      attack.frames.length - 1,
    );
    this.attackImpactCallback = onImpact;
    this.attackImpactFrameName = attack.frames[impactFrame].name;

    // Frame 0 is visible immediately when play() starts, so frame N begins after N frame intervals.
    const impactLead = impactFrame / attack.frameRate * 1000;
    const playDelay = Math.max(0, impactAt - this.scene.time.now - impactLead);
    this.attackStartTimer = this.scene.time.delayedCall(playDelay, () => {
      this.attackStartTimer = undefined;
      if (this.visualState !== 'attacking' || this.defeated) return;
      this.attackCompleteHandler = () => {
        this.attackCompleteHandler = undefined;
        this.attackImpactCallback = undefined;
        this.attackImpactFrameName = undefined;
        if (!this.defeated) this.showIdle(true);
      };
      this.once(`animationcomplete-${attack.animation}`, this.attackCompleteHandler);
      this.play(attack.animation);
    });
  }

  cancelAttack(): void {
    this.attackStartTimer?.remove(false);
    this.attackImpactTimer?.remove(false);
    this.attackStartTimer = undefined;
    this.attackImpactTimer = undefined;
    this.attackImpactCallback = undefined;
    this.attackImpactFrameName = undefined;
    const attack = this.visual?.attack;
    if (attack && this.attackCompleteHandler) this.off(`animationcomplete-${attack.animation}`, this.attackCompleteHandler);
    this.attackCompleteHandler = undefined;
    if (this.visualState === 'attacking' || this.anims.currentAnim?.key === attack?.animation) this.anims.stop();
  }

  defeat(): void {
    this.defeated = true;
    this.visualState = 'dead';
    this.cancelAttack();
    this.hurtTimer?.remove(false);
    this.disableBody(true, true);
  }

  private faceDirection(direction: number): void {
    const sourceFacesLeft = this.visual?.sourceFaces === 'left';
    this.setFlipX(sourceFacesLeft ? direction > 0 : direction < 0);
  }

  private showIdle(force = false): void {
    if (this.defeated || (!force && this.visualState === 'attacking')) return;
    if (!force && this.visualState === 'idle') return;
    this.visualState = 'idle';
    this.anims.stop();
    if (this.visual) this.applyPose(this.visual.idle);
  }

  private showWalk(): void {
    if (this.defeated || this.visualState === 'attacking') return;
    const walk = this.visual?.walk;
    if (!walk) return;
    if (this.visualState !== 'walking') {
      this.visualState = 'walking';
      this.applyAnimationFrame(walk, 0);
      this.play(walk.animation, true);
    }
  }

  private readonly handleAnimationFrame = (_animation: Phaser.Animations.Animation,
    frame: Phaser.Animations.AnimationFrame): void => {
    const config = this.visualState === 'walking' ? this.visual?.walk
      : this.visualState === 'attacking' ? this.visual?.attack : undefined;
    if (!config) return;
    const frameName = String(frame.textureFrame);
    const layout = config.frames.find((candidate) => candidate.name === frameName);
    if (layout) this.applyLayout(layout, config.scale);

    if (this.visualState === 'attacking' && frameName === this.attackImpactFrameName && this.attackImpactCallback) {
      const callback = this.attackImpactCallback;
      this.attackImpactCallback = undefined;
      this.attackImpactFrameName = undefined;
      callback();
    }
  };

  private applyPose(pose: EnemyVisualPose): void {
    const frameName = pose.frame?.name;
    this.setTexture(pose.texture, frameName === '__BASE' ? undefined : frameName);
    if (pose.frame) this.applyLayout(pose.frame, pose.scale);
  }

  private applyAnimationFrame(animation: EnemyVisualAnimation, index: number): void {
    const frame = animation.frames[index];
    this.setTexture(animation.texture, frame.name);
    this.applyLayout(frame, animation.scale);
  }

  private applyLayout(frame: EnemyVisualFrame, scale: number): void {
    const halfBody = this.visual!.body.height / 2;
    this.setScale(scale).setOrigin(
      frame.anchorX / frame.width,
      (frame.footY - halfBody / scale) / frame.height,
    );
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.visual!.body.width / scale, this.visual!.body.height / scale, false);
    body.setOffset(
      frame.anchorX - this.visual!.body.width / scale / 2,
      frame.footY - this.visual!.body.height / scale,
    );
    body.updateBounds();
  }
}
