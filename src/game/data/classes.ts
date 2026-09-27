import type { ClassDefinition, ClassId } from '../types';

export const CLASSES: Record<ClassId, ClassDefinition> = {
  mage: {
    id: 'mage', name: 'Runesinger', hp: 82,
    tagline: 'Long elemental words, high power, fragile footing.',
    resource: { name: 'Mana', short: 'MP', max: 60, regen: 4.5, color: '#66b9ff' },
    abilities: [
      { id: 'zap', name: 'Spark', trigger: 'zap', suffixes: [], cost: 0, basePower: 7, kind: 'ranged', color: 0xffe76a, description: 'A quick free bolt.' },
      { id: 'fireball', name: 'Fireball', trigger: 'fireball', suffixes: ['ignis', 'nova'], cost: 14, basePower: 24, kind: 'ranged', color: 0xff7a45, description: 'A heavy ember projectile.' },
      { id: 'icespike', name: 'Ice Spike', trigger: 'icespike', suffixes: ['glacies', 'aeterna'], cost: 12, basePower: 18, kind: 'ranged', color: 0x8fdcff, description: 'Delays the enemy strike.' },
      { id: 'mend', name: 'Mend', trigger: 'mend', suffixes: ['vitae', 'lux'], cost: 16, basePower: 20, kind: 'heal', color: 0x78edaa, description: 'Restores health.' },
    ],
  },
  warrior: {
    id: 'warrior', name: 'Berserker', hp: 132,
    tagline: 'Short brutal words, strong health, close-range force.',
    resource: { name: 'Rage', short: 'RG', max: 50, regen: 6, color: '#ff805d' },
    abilities: [
      { id: 'hit', name: 'Strike', trigger: 'hit', suffixes: [], cost: 0, basePower: 9, kind: 'melee', color: 0xfff1c7, description: 'A quick free strike.' },
      { id: 'slash', name: 'Sunder', trigger: 'slash', suffixes: ['rend', 'ruin'], cost: 10, basePower: 21, kind: 'melee', color: 0xffc477, description: 'A reliable heavy cut.' },
      { id: 'cleave', name: 'Cleave', trigger: 'cleave', suffixes: ['crush', 'doom'], cost: 16, basePower: 31, kind: 'melee', color: 0xff7a55, description: 'Maximum close-range damage.' },
      { id: 'guard', name: 'Guard', trigger: 'guard', suffixes: ['wall', 'iron'], cost: 8, basePower: 0, kind: 'guard', color: 0x8fcfff, description: 'Reduces the next enemy hit.' },
    ],
  },
  samurai: {
    id: 'samurai', name: 'Wayfarer', hp: 96,
    tagline: 'Rhythm and focus reward a clean, accurate sequence.',
    resource: { name: 'Ki', short: 'KI', max: 40, regen: 5, color: '#f0bb61' },
    abilities: [
      { id: 'cut', name: 'Cut', trigger: 'cut', suffixes: [], cost: 0, basePower: 8, kind: 'melee', color: 0xfff3da, description: 'A clean free cut.' },
      { id: 'iaido', name: 'Iaido', trigger: 'iaido', suffixes: ['kiri', 'zan'], cost: 12, basePower: 23, kind: 'melee', color: 0xffdda0, description: 'A precise passing strike.' },
      { id: 'flurry', name: 'Flurry', trigger: 'flurry', suffixes: ['rush', 'storm'], cost: 15, basePower: 27, kind: 'melee', color: 0xf8a8d0, description: 'A storm of quick cuts.' },
      { id: 'zen', name: 'Zen', trigger: 'zen', suffixes: ['mind', 'void'], cost: 0, basePower: 0, kind: 'focus', color: 0xf0bb61, description: 'Restores Ki and builds focus.' },
    ],
  },
};
