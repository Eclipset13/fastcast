import { buildWord } from '../systems/CombatMath';
import { selectedAbilityRank } from '../systems/Progression';
import type { PlayerState, SpellCandidate } from '../types';

export function selectDeckSpell(state: PlayerState, previous: string | null, random = Math.random): SpellCandidate | null {
  const equipped = state.classDef.abilities.filter((ability) =>
    state.deckAbilityIds.slice(0, 6).includes(ability.id) && state.learnedAbilityIds.includes(ability.id));
  const affordable = equipped.filter((ability) => ability.cost <= state.resource);
  // Wait for regeneration when no equipped spell is affordable. Never cast for free.
  if (!affordable.length) return null;
  const choices = affordable.length > 1 ? affordable.filter((ability) => ability.id !== previous) : affordable;
  const ability = choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
  const rank = selectedAbilityRank(state, ability);
  return { ability, rank, word: buildWord(ability, rank), affordable: true };
}
