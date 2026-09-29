import { COMBAT_TUNING } from '../config/constants';
import type { AbilityDefinition, PlayerState, WordDefinition } from '../types';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function buildWord(ability: AbilityDefinition, level: number): WordDefinition {
  const words = ability.words;
  const explicit = words?.[Math.max(0, Math.min(level - 1, words.length - 1))];
  if (explicit) return { segments: [explicit], full: explicit, boundaries: [explicit.length] };

  const segments = [ability.trigger, ...ability.suffixes.slice(0, Math.max(0, level - 1))];
  let length = 0;
  const boundaries = segments.map((segment) => (length += segment.length));
  return { segments, full: segments.join(''), boundaries };
}

export function cpsFrom(times: number[]): number | null {
  if (times.length < 2) return null;
  const seconds = (times.at(-1)! - times[0]) / 1000;
  return seconds <= 0 ? COMBAT_TUNING.fastCps : (times.length - 1) / seconds;
}

export function speedMultiplier(cps: number | null): number {
  if (cps === null) return 1;
  const position = clamp((cps - COMBAT_TUNING.slowCps) / (COMBAT_TUNING.fastCps - COMBAT_TUNING.slowCps), 0, 1);
  return COMBAT_TUNING.minMultiplier + (COMBAT_TUNING.maxMultiplier - COMBAT_TUNING.minMultiplier) * position;
}

export function abilityPower(ability: AbilityDefinition, tier: number, speed: number, player: PlayerState, rank?: number): number {
  const unlocked = player.abilityLevels[ability.id] ?? 1;
  const activeRank = Math.max(1, Math.min(rank ?? unlocked, unlocked));
  const rankedPower = ability.rankPowers?.[activeRank - 1];
  const base = rankedPower ?? ability.basePower * COMBAT_TUNING.tierMultiplier[tier];
  return base * speed * (1 + COMBAT_TUNING.levelDamageBonus * (player.level - 1));
}
