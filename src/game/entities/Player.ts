import Phaser from 'phaser';
import { MOVEMENT } from '../config/constants';
import type { PlayerState } from '../types';
import { inputBridge } from '../systems/InputBridge';

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

  constructor(scene: Phaser.Scene, x: number, y: number, readonly playerState: PlayerState) {
    super(scene, x, y, `hero-${playerState.classDef.id}-idle`);
    scene.add.existing(this); scene.physics.add.existing(this);
    this.setDepth(20).setCollideWorldBounds(true).setDragX(800).setMaxVelocity(420, 500);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(12, 26).setOffset(3, 3);
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.keys = scene.input.keyboard!.addKeys({ left: 'A', right: 'D', jump: 'W', dash: 'SHIFT' }) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  setControl(enabled: boolean): void {
    this.canControl = enabled;
    if (!enabled) this.setVelocity(0, 0);
  }

  update(time: number): void {
    if (!this.canControl) { this.setTexture(`hero-${this.playerState.classDef.id}-idle`); return; }
    const body = this.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down || body.touching.down;
    if (grounded) { this.coyoteUntil = time + 90; this.jumpCount = 0; this.airDashed = false; }

    if (time < this.dashUntil) {
      this.setVelocityX((this.flipX ? -1 : 1) * MOVEMENT.dashSpeed); this.setVelocityY(0);
      this.setTexture(`hero-${this.playerState.classDef.id}-dash`);
      return;
    }

    const left = this.cursors.left.isDown || this.keys.left.isDown || inputBridge.left;
    const right = this.cursors.right.isDown || this.keys.right.isDown || inputBridge.right;
    const direction = Number(right) - Number(left);
    this.setVelocityX(direction * MOVEMENT.runSpeed);
    if (direction !== 0) this.setFlipX(direction < 0);

    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.cursors.space) || Phaser.Input.Keyboard.JustDown(this.keys.jump) || inputBridge.consumeJump();
    const maxJumps = this.playerState.unlocks.doubleJump ? 2 : 1;
    if (jumpPressed && (time <= this.coyoteUntil || this.jumpCount < maxJumps)) {
      this.setVelocityY(-MOVEMENT.jumpSpeed); this.jumpCount += 1; this.coyoteUntil = 0;
    }
    const dashPressed = Phaser.Input.Keyboard.JustDown(this.keys.dash) || inputBridge.consumeDash();
    if (dashPressed && time >= this.dashReadyAt && (!this.airDashed || grounded)) {
      this.dashUntil = time + (this.playerState.unlocks.longDash ? MOVEMENT.dashDuration * 1.7 : MOVEMENT.dashDuration);
      this.dashReadyAt = time + MOVEMENT.dashCooldown; this.airDashed = !grounded;
    }

    if (!grounded) this.setTexture(`hero-${this.playerState.classDef.id}-jump`);
    else if (direction !== 0) {
      if (time > this.nextRunFrame) { this.runFrame = !this.runFrame; this.nextRunFrame = time + 115; }
      this.setTexture(`hero-${this.playerState.classDef.id}-${this.runFrame ? 'run-a' : 'run-b'}`);
    } else this.setTexture(`hero-${this.playerState.classDef.id}-idle`);
  }
}
