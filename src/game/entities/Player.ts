import Phaser from 'phaser';
import { MOVEMENT } from '../config/constants';
import type { PlayerState } from '../types';
import { inputBridge } from '../systems/InputBridge';
import { MAGE_JUMP_SPRITE, MAGE_RUN_SPRITE, MAGE_SPRITE } from './mageSprite';

const JUMP_FRAMES = {
  'jump-prepare': 0, 'jump-crouch': 1, 'jump-launch': 2, 'jump-rise': 3,
  'jump-apex': 4, 'jump-fall': 5, 'land-impact': 6, 'land-recover': 7,
} as const;
type JumpPose = keyof typeof JUMP_FRAMES;
type PlayerPose = 'idle' | 'run-a' | 'run-b' | 'dash' | JumpPose;

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  private canControl = true;
  private coyoteUntil = 0;
  private jumpCount = 0;
  private dashUntil = 0;
  private dashReadyAt = 0;
  private airDashed = false;
  private runFrame = false;
  private nextRunFrame = 0;
  private readonly usesMageSheet: boolean;
  private nextAfterimageAt = 0;
  private lastAfterimageX = 0;
  private lastAfterimageY = 0;
  private jumpWindupUntil = 0;
  private jumpBufferedUntil = 0;
  private launchedAt = -Infinity;
  private landingUntil = 0;
  private wasGrounded = false;
  private lastFallSpeed = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly playerState: PlayerState) {
    const usesMageSheet = playerState.classDef.id === 'mage' && scene.textures.exists(MAGE_SPRITE.key);
    super(scene, x, y, usesMageSheet ? MAGE_SPRITE.key : `hero-${playerState.classDef.id}-idle`, usesMageSheet ? MAGE_SPRITE.idleFrame : undefined);
    this.usesMageSheet = usesMageSheet;
    scene.add.existing(this); scene.physics.add.existing(this);
    this.setDepth(20).setCollideWorldBounds(true).setDragX(800).setMaxVelocity(420, 500);
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (usesMageSheet) {
      this.applyMageLayout(MAGE_SPRITE);
    } else body.setSize(12, 26).setOffset(3, 3);
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.keys = scene.input.keyboard!.addKeys({ left: 'A', right: 'D', jump: 'W', dash: 'SHIFT' }) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  setControl(enabled: boolean): void {
    this.canControl = enabled;
    if (!enabled) {
      this.dashUntil = 0;
      this.jumpWindupUntil = 0;
      this.jumpBufferedUntil = 0;
      this.landingUntil = 0;
      this.lastFallSpeed = 0;
      this.setVelocity(0, 0);
      this.showPose('idle');
    }
  }

  private applyMageLayout(art: typeof MAGE_SPRITE | typeof MAGE_RUN_SPRITE | typeof MAGE_JUMP_SPRITE): void {
    const footY = art.footY;
    const scale = art.displayHeight / art.frameHeight;
    this.setScale(scale).setOrigin(0.5, footY / art.frameHeight - 14 / art.displayHeight);
    // Art can change dimensions; collision size and world-space feet stay fixed.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(12 / scale, 26 / scale).setOffset(
      (art.frameWidth - 12 / scale) / 2, footY - 26 / scale,
    );
    // setSize uses the cached scale; refresh it in this frame without moving the body.
    body.updateBounds();
  }

  private emitDashAfterimage(time: number, force = false): void {
    if (!force && (time < this.nextAfterimageAt ||
      Phaser.Math.Distance.Between(this.x, this.y, this.lastAfterimageX, this.lastAfterimageY) < 3)) return;
    this.nextAfterimageAt = time + 28;
    this.lastAfterimageX = this.x;
    this.lastAfterimageY = this.y;
    const silhouette = this.scene.add.image(this.x, this.y, this.texture.key, this.frame.name)
      .setName('dash-afterimage')
      .setOrigin(this.originX, this.originY)
      .setScale(this.scaleX, this.scaleY)
      .setFlip(this.flipX, this.flipY)
      .setAngle(this.angle)
      .setDepth(this.depth - 1)
      .setTintFill(0x8feaff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.55);
    // A soft cyan halo surrounds the bright silhouette, rather than a flat tint.
    const glow = this.scene.game.renderer.type === Phaser.WEBGL
      ? silhouette.postFX.addGlow(0x26bfff, 1.5, 0, false, 0.1, 3) : undefined;
    this.scene.tweens.add({
      targets: silhouette,
      alpha: 0,
      duration: 200,
      ease: 'Quad.Out',
      onUpdate: () => { if (glow) glow.outerStrength = 1.5 * silhouette.alpha / 0.55; },
      onComplete: () => silhouette.destroy(),
    });
  }

  private showPose(pose: PlayerPose): void {
    const isJumpPose = pose in JUMP_FRAMES;
    if (!this.usesMageSheet) {
      const fallback = isJumpPose ? (pose.startsWith('land-') || pose === 'jump-prepare' || pose === 'jump-crouch' ? 'idle' : 'jump') : pose;
      this.setTexture(`hero-${this.playerState.classDef.id}-${fallback}`);
      return;
    }
    if (isJumpPose && this.scene.textures.exists(MAGE_JUMP_SPRITE.key)) {
      this.anims.stop();
      if (this.texture.key !== MAGE_JUMP_SPRITE.key) {
        this.setTexture(MAGE_JUMP_SPRITE.key, JUMP_FRAMES[pose as JumpPose]);
        this.applyMageLayout(MAGE_JUMP_SPRITE);
      } else this.setFrame(JUMP_FRAMES[pose as JumpPose]);
      return;
    }
    const running = pose !== 'idle' && this.scene.textures.exists(MAGE_RUN_SPRITE.key);
    const textureKey = running ? MAGE_RUN_SPRITE.key : MAGE_SPRITE.key;
    if (this.texture.key !== textureKey) {
      this.anims.stop();
      this.setTexture(textureKey, running ? 0 : MAGE_SPRITE.idleFrame);
      this.applyMageLayout(running ? MAGE_RUN_SPRITE : MAGE_SPRITE);
    }
    if (running && (pose === 'run-a' || pose === 'run-b')) {
      this.play(MAGE_RUN_SPRITE.animation, true);
    } else {
      this.anims.stop();
      this.setFrame(running ? MAGE_RUN_SPRITE.airborneFrame : MAGE_SPRITE.idleFrame);
    }
  }

  private launchJump(time: number, groundedJump: boolean): void {
    this.setVelocityY(-MOVEMENT.jumpSpeed);
    this.jumpCount = groundedJump ? 1 : Math.max(1, this.jumpCount) + 1;
    this.jumpWindupUntil = 0;
    this.jumpBufferedUntil = 0;
    this.coyoteUntil = 0;
    this.landingUntil = 0;
    this.launchedAt = time;
  }

  update(time: number): void {
    if (!this.canControl) { this.showPose('idle'); return; }
    const body = this.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down || body.touching.down;
    if (grounded) {
      if (!this.wasGrounded && this.lastFallSpeed > 110) this.landingUntil = time + MOVEMENT.landingRecovery;
      this.coyoteUntil = time + 90;
      this.jumpCount = 0;
      this.airDashed = false;
      this.lastFallSpeed = 0;
    } else this.lastFallSpeed = body.velocity.y;
    this.wasGrounded = grounded;

    // Read every input source, even when a dash currently owns movement.
    const keyboardJump = [this.cursors.up, this.cursors.space, this.keys.jump]
      .map((key) => Phaser.Input.Keyboard.JustDown(key)).some(Boolean);
    const touchJump = inputBridge.consumeJump();
    if (keyboardJump || touchJump) this.jumpBufferedUntil = time + MOVEMENT.jumpBuffer;
    const keyboardDash = Phaser.Input.Keyboard.JustDown(this.keys.dash);
    const touchDash = inputBridge.consumeDash();
    const dashPressed = keyboardDash || touchDash;

    if (time < this.dashUntil) {
      this.setVelocityX((this.flipX ? -1 : 1) * MOVEMENT.dashSpeed); this.setVelocityY(0);
      this.showPose('dash');
      this.emitDashAfterimage(time);
      return;
    }

    const left = this.cursors.left.isDown || this.keys.left.isDown || inputBridge.left;
    const right = this.cursors.right.isDown || this.keys.right.isDown || inputBridge.right;
    const direction = Number(right) - Number(left);
    const landingProgress = Phaser.Math.Clamp(1 - (this.landingUntil - time) / MOVEMENT.landingRecovery, 0, 1);
    const recoverySpeed = grounded ? Phaser.Math.Linear(MOVEMENT.landingSpeedFactor, 1, landingProgress) : 1;
    this.setVelocityX(direction * MOVEMENT.runSpeed * recoverySpeed);
    if (direction !== 0) this.setFlipX(direction < 0);

    if (dashPressed && time >= this.dashReadyAt && (!this.airDashed || grounded)) {
      this.jumpWindupUntil = 0;
      this.jumpBufferedUntil = 0;
      this.landingUntil = 0;
      this.dashUntil = time + (this.playerState.unlocks.longDash ? MOVEMENT.dashDuration * 1.7 : MOVEMENT.dashDuration);
      this.dashReadyAt = time + MOVEMENT.dashCooldown; this.airDashed = !grounded;
      this.setVelocity((this.flipX ? -1 : 1) * MOVEMENT.dashSpeed, 0);
      this.showPose('dash');
      this.emitDashAfterimage(time, true);
      return;
    }

    if (!this.jumpWindupUntil && time < this.jumpBufferedUntil) {
      const groundedJump = grounded || time <= this.coyoteUntil;
      const airJump = this.playerState.unlocks.doubleJump && this.jumpCount < 2;
      if (groundedJump || airJump) {
        this.jumpBufferedUntil = 0;
        this.landingUntil = 0;
        if (grounded && this.usesMageSheet && this.scene.textures.exists(MAGE_JUMP_SPRITE.key)) {
          this.jumpWindupUntil = time + MOVEMENT.jumpAnticipation;
        } else this.launchJump(time, groundedJump);
      }
    }
    if (this.jumpWindupUntil) {
      if (time >= this.jumpWindupUntil) this.launchJump(time, true);
      else {
        this.setVelocityX(direction * MOVEMENT.runSpeed * 0.45);
        this.showPose(this.jumpWindupUntil - time > MOVEMENT.jumpAnticipation / 2 ? 'jump-prepare' : 'jump-crouch');
        return;
      }
    }

    if (!grounded || body.velocity.y < 0) {
      const pose = time - this.launchedAt < 65 ? 'jump-launch'
        : body.velocity.y < -85 ? 'jump-rise'
        : body.velocity.y <= 85 ? 'jump-apex' : 'jump-fall';
      this.showPose(pose);
    } else if (time < this.landingUntil) {
      this.showPose(landingProgress < 0.4 ? 'land-impact' : 'land-recover');
    }
    else if (direction !== 0) {
      if (time > this.nextRunFrame) { this.runFrame = !this.runFrame; this.nextRunFrame = time + 115; }
      this.showPose(this.runFrame ? 'run-a' : 'run-b');
    } else this.showPose('idle');
  }
}
