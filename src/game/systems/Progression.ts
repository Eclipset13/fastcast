import { xpForLevel } from '../config/constants';
import type { AbilityDefinition, ClassDefinition, PlayerState } from '../types';

const maxRank = (ability: AbilityDefinition) => ability.words?.length ?? ability.suffixes.length + 1;

export function createPlayerState(classDef: ClassDefinition): PlayerState {
  const starterDeck = classDef.starterDeck?.slice(0, 6) ?? classDef.abilities.slice(0, 6).map((ability) => ability.id);
  const learnedAbilityIds = classDef.id === 'mage'
    ? classDef.abilities.filter((ability) => ability.starter).map((ability) => ability.id)
    : classDef.abilities.map((ability) => ability.id);

  return {
    classDef, level: 1, xp: 0, skillPoints: 0,
    hp: classDef.hp, maxHp: classDef.hp,
    resource: classDef.resource.max, maxResource: classDef.resource.max,
    focus: 0,
    abilityLevels: Object.fromEntries(classDef.abilities.map((ability) => [ability.id, 1])),
    learnedAbilityIds,
    deckAbilityIds: starterDeck.filter((id) => learnedAbilityIds.includes(id)),
    unlocks: { doubleJump: false, longDash: false },
  };
}

export function gainXp(player: PlayerState, amount: number): number[] {
  player.xp += amount;
  const levels: number[] = [];
  while (player.xp >= xpForLevel(player.level)) {
    player.xp -= xpForLevel(player.level);
    player.level += 1;
    player.skillPoints += 1;
    player.maxHp = Math.round(player.maxHp * 1.12);
    player.maxResource = Math.round(player.maxResource * 1.1);
    player.hp = player.maxHp; player.resource = player.maxResource;
    levels.push(player.level);
  }
  return levels;
}

export function isAbilityLearned(player: PlayerState, ability: AbilityDefinition): boolean {
  return player.learnedAbilityIds.includes(ability.id);
}

export function canLearn(player: PlayerState, ability: AbilityDefinition): boolean {
  const cost = ability.unlockCost ?? 0;
  return !isAbilityLearned(player, ability) && player.skillPoints >= cost;
}

export function learnAbility(player: PlayerState, ability: AbilityDefinition): boolean {
  if (!canLearn(player, ability)) return false;
  player.skillPoints -= ability.unlockCost ?? 0;
  player.learnedAbilityIds.push(ability.id);
  return true;
}

export function abilityUpgradeCost(player: PlayerState, ability: AbilityDefinition): number | null {
  const level = player.abilityLevels[ability.id] ?? 1;
  if (level >= maxRank(ability)) return null;
  return ability.upgradeCosts?.[level - 1] ?? 1;
}

export function canUpgrade(player: PlayerState, ability: AbilityDefinition): boolean {
  const cost = abilityUpgradeCost(player, ability);
  return isAbilityLearned(player, ability) && cost !== null && player.skillPoints >= cost;
}

export function upgradeAbility(player: PlayerState, ability: AbilityDefinition): boolean {
  const cost = abilityUpgradeCost(player, ability);
  if (cost === null || !canUpgrade(player, ability)) return false;
  player.skillPoints -= cost;
  player.abilityLevels[ability.id] += 1;
  return true;
}

export function canEquipAbility(player: PlayerState, ability: AbilityDefinition): boolean {
  return isAbilityLearned(player, ability) && !player.deckAbilityIds.includes(ability.id) && player.deckAbilityIds.length < 6;
}

export function equipAbility(player: PlayerState, ability: AbilityDefinition): boolean {
  if (!canEquipAbility(player, ability)) return false;
  player.deckAbilityIds.push(ability.id);
  return true;
}

export function unequipAbility(player: PlayerState, abilityId: string): boolean {
  const index = player.deckAbilityIds.indexOf(abilityId);
  if (index < 0) return false;
  player.deckAbilityIds.splice(index, 1);
  return true;
}

export function replaceDeckAbility(player: PlayerState, slot: number, ability: AbilityDefinition): boolean {
  if (!isAbilityLearned(player, ability) || slot < 0 || slot >= 6) return false;
  const existing = player.deckAbilityIds.indexOf(ability.id);
  if (existing >= 0) player.deckAbilityIds.splice(existing, 1);
  if (slot < player.deckAbilityIds.length) player.deckAbilityIds[slot] = ability.id;
  else {
    while (player.deckAbilityIds.length < slot) player.deckAbilityIds.push('');
    player.deckAbilityIds[slot] = ability.id;
  }
  player.deckAbilityIds = player.deckAbilityIds.filter(Boolean).slice(0, 6);
  return true;
}
