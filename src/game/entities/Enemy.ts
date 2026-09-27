import Phaser from 'phaser';
import type { EnemyDefinition } from '../types';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  hp: number;
  defeated = false;
  private direction = -1;
  private readonly homeX: number;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly definition: EnemyDefinition) {
    super(scene, x, y, `enemy-${definition.id}`);
    scene.add.existing(this); scene.physics.add.existing(this);
    this.homeX = x; this.hp = definition.hp;
    this.setDepth(20).setCollideWorldBounds(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(18, 30).setOffset(3, 4);
  }

  update(): void {
    if (this.defeated || !this.body?.enable) return;
    if (this.x < this.homeX - 45) this.direction = 1;
    if (this.x > this.homeX + 45) this.direction = -1;
    this.setVelocityX(this.direction * 20).setFlipX(this.direction > 0);
    this.y += Math.sin(this.scene.time.now / 310) * 0.035;
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.clearTint());
  }

  defeat(): void {
    this.defeated = true;
    this.disableBody(true, true);
  }
}
