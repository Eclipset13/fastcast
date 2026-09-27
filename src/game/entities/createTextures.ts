import Phaser from 'phaser';
import type { ClassId, EnemyDefinition } from '../types';

const colors: Record<ClassId, { cloak: string; accent: string; skin: string }> = {
  mage: { cloak: '#4a4a9b', accent: '#92c8ff', skin: '#e9bea2' },
  warrior: { cloak: '#a63642', accent: '#f4b15d', skin: '#dca889' },
  samurai: { cloak: '#2c5962', accent: '#efc26d', skin: '#e1ad91' },
};

function canvas(scene: Phaser.Scene, key: string, width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) return;
  texture.context.imageSmoothingEnabled = false;
  paint(texture.context);
  texture.refresh();
}

export function createHeroTextures(scene: Phaser.Scene, classId: ClassId): void {
  const palette = colors[classId];
  ['idle', 'run-a', 'run-b', 'jump', 'dash'].forEach((pose, index) => {
    canvas(scene, `hero-${classId}-${pose}`, 18, 30, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(3, 28, 12, 2);
      ctx.fillStyle = palette.cloak;
      ctx.fillRect(5, 12, 9, 12); ctx.fillRect(3, 18, 13, 8);
      ctx.fillStyle = palette.accent;
      ctx.fillRect(6, 13, 2, 9); ctx.fillRect(11, 14, 2, 6);
      ctx.fillStyle = palette.skin; ctx.fillRect(6, 6, 7, 7);
      ctx.fillStyle = '#17182b'; ctx.fillRect(5, 5, 9, 3); ctx.fillRect(4, 3, 3, 4); ctx.fillRect(12, 2, 3, 5);
      ctx.fillStyle = '#effff3'; ctx.fillRect(11, 8, 1, 1);
      const legOffset = pose === 'run-a' ? -1 : pose === 'run-b' ? 1 : 0;
      ctx.fillStyle = '#172526'; ctx.fillRect(5 + legOffset, 24, 3, pose === 'jump' ? 4 : 5); ctx.fillRect(11 - legOffset, 24, 3, pose === 'jump' ? 3 : 5);
      if (classId === 'mage') { ctx.fillStyle = '#69422e'; ctx.fillRect(15, 8, 1, 19); ctx.fillStyle = palette.accent; ctx.fillRect(14, 6, 3, 3); }
      if (classId === 'warrior') { ctx.fillStyle = '#d9e3dc'; ctx.fillRect(15, 7, 2, 17); ctx.fillStyle = '#60412f'; ctx.fillRect(14, 20, 3, 2); }
      if (classId === 'samurai') { ctx.fillStyle = '#dfe6dd'; ctx.fillRect(1, 18, 10, 1); ctx.fillStyle = '#5d3a28'; ctx.fillRect(2, 19, 7, 1); }
      if (pose === 'dash') { ctx.globalAlpha = 0.35; ctx.fillStyle = palette.accent; ctx.fillRect(0, 11, 5, 10); }
      if (index === 2) { ctx.fillStyle = palette.accent; ctx.fillRect(3, 15, 2, 2); }
    });
  });
}

export function createEnemyTexture(scene: Phaser.Scene, enemy: EnemyDefinition): void {
  canvas(scene, `enemy-${enemy.id}`, 24, 34, (ctx) => {
    const body = `#${enemy.color.toString(16).padStart(6, '0')}`;
    const accent = `#${enemy.accent.toString(16).padStart(6, '0')}`;
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(2, 31, 20, 3);
    ctx.fillStyle = body;
    ctx.fillRect(7, 7, 11, 20); ctx.fillRect(4, 15, 17, 12); ctx.fillRect(6, 25, 4, 6); ctx.fillRect(15, 25, 4, 6);
    ctx.fillRect(5, 4, 4, 7); ctx.fillRect(16, 2, 3, 8);
    ctx.fillStyle = accent; ctx.fillRect(8, 10, 3, 2); ctx.fillRect(15, 10, 3, 2);
    ctx.fillRect(2, 17, 3, 7); ctx.fillRect(20, 15, 3, 9);
    ctx.globalAlpha = 0.45; ctx.fillRect(9, 14, 7, 10);
  });
}

export function createFxTextures(scene: Phaser.Scene): void {
  canvas(scene, 'pixel-white', 2, 2, (ctx) => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 2, 2); });
  canvas(scene, 'spell-orb', 7, 7, (ctx) => {
    ctx.fillStyle = '#fff3b0'; ctx.fillRect(2, 0, 3, 7); ctx.fillRect(0, 2, 7, 3);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(2, 2, 3, 3);
  });
}
