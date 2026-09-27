import { xpForLevel } from '../config/constants';
import type { AbilityDefinition, ClassDefinition, PlayerState } from '../types';

export function createPlayerState(classDef: ClassDefinition): PlayerState {
  return {
    classDef, level: 1, xp: 0, skillPoints: 0,
    hp: classDef.hp, maxHp: classDef.hp,
    resource: classDef.resource.max, maxResource: classDef.resource.max,
    focus: 0,
    abilityLevels: Object.fromEntries(classDef.abilities.map((ability) => [ability.id, 1])),
    unlocks: { doubleJump: false, longDash: false },
  };
}

export function gainXp(player: PlayerState, amount: number): number[] {
  player.xp += amount;
  const levels: number[] = [];
  while (player.xp >= xpForLevel(player.level)) {
    player.xp -= xpForLevel(player.level);
    player.level += 1; player.skillPoints += 1;
    player.maxHp = Math.round(player.maxHp * 1.12);
    player.maxResource = Math.round(player.maxResource * 1.1);
    player.hp = player.maxHp; player.resource = player.maxResource;
    levels.push(player.level);
  }
  return levels;
}

export function canUpgrade(player: PlayerState, ability: AbilityDefinition): boolean {
  return player.skillPoints > 0 && player.abilityLevels[ability.id] < ability.suffixes.length + 1;
}

export function upgradeAbility(player: PlayerState, ability: AbilityDefinition): boolean {
  if (!canUpgrade(player, ability)) return false;
  player.skillPoints -= 1; player.abilityLevels[ability.id] += 1;
  return true;
}
