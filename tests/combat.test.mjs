import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

// Vite loads the same TypeScript modules used in-game; no separate test implementation.
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
after(() => server.close());
const { DefenseTiming } = await server.ssrLoadModule('/src/game/combat/DefenseTiming.ts');
const { DefenseStrike } = await server.ssrLoadModule('/src/game/combat/DefenseStrike.ts');
const { TypingParser } = await server.ssrLoadModule('/src/game/systems/TypingParser.ts');
const { selectDeckSpell } = await server.ssrLoadModule('/src/game/combat/SpellSelection.ts');
const { createPlayerState, selectAbilityRank, selectedAbilityRank } =
  await server.ssrLoadModule('/src/game/systems/Progression.ts');
const { CLASSES } = await server.ssrLoadModule('/src/game/data/classes.ts');

test('defense accepts both inclusive edges of the 200ms window', () => {
  for (const offset of [-201, -200, -150, 0, 150, 200, 201]) {
    const qte = new DefenseTiming('7', 1000, 1000, 200);
    assert.equal(qte.press('7', 1000 + offset), Math.abs(offset) <= 200 ? 'perfect' : 'failed');
  }
});

test('attack waits through late grace; wrong input cannot be retried', () => {
  const qte = new DefenseTiming('0', 1000, 1000, 200);
  assert.equal(qte.update(1000), 'pending');
  assert.equal(qte.update(1200), 'pending');
  assert.equal(qte.update(1201), 'failed');
  assert.equal(qte.press('0', 1000), 'failed');
  const wrong = new DefenseTiming('7', 1000, 1000, 200);
  assert.equal(wrong.press('3', 1000), 'failed');
  assert.equal(wrong.press('7', 1000), 'failed');
});

test('ring has a full warning, shrinks linearly, and holds at target through grace', () => {
  const qte = new DefenseTiming('7', 3400, 1000, 200);
  assert.equal(qte.startsAt, 2400);
  assert.equal(qte.progress(2400), 0);
  assert.equal(qte.progress(2900), 0.5);
  assert.equal(qte.progress(3400), 1);
  assert.equal(qte.progress(3590), 1);
});

test('successful defense keeps one digit and one timing object until impact', () => {
  const timing = new DefenseTiming('4', 5000, 1000, 200);
  const strike = new DefenseStrike(timing);
  assert.equal(strike.press('4', 4910), 'perfect');
  for (const now of [4920, 4980, 5000, 5100]) {
    strike.update(now);
    assert.equal(strike.timing, timing);
    assert.equal(strike.timing.digit, '4');
    assert.equal(strike.result, 'perfect');
    assert.equal(strike.consumeResolution(now, 430), null);
  }
  strike.reachImpact(5201);
  assert.equal(strike.consumeResolution(5201, 430), 'perfect');
  assert.equal(strike.timing.digit, '4');
});

test('wrong defense digit fails without replacing the advertised digit', () => {
  const timing = new DefenseTiming('4', 5000, 1000, 200);
  const strike = new DefenseStrike(timing);
  assert.equal(strike.press('7', 5000), 'failed');
  assert.equal(strike.timing, timing);
  assert.equal(strike.timing.digit, '4');
  assert.equal(strike.consumeResolution(5000, 430), null);
});

test('timeout remains on the same strike until impact and applies once', () => {
  const timing = new DefenseTiming('4', 5000, 1000, 200);
  const strike = new DefenseStrike(timing);
  assert.equal(strike.update(5201), 'failed');
  assert.equal(strike.timing, timing);
  assert.equal(strike.consumeResolution(5201, 430), null);
  strike.reachImpact(5201);
  assert.equal(strike.consumeResolution(5201, 430), 'failed');
  assert.equal(strike.consumeResolution(5202, 430), null);
  assert.equal(strike.consumeResolution(5400, 430), null);
});

test('a new strike can begin only after the previous result display completes', () => {
  const first = new DefenseStrike(new DefenseTiming('4', 5000, 1000, 200));
  first.press('4', 5000);
  first.reachImpact(5201);
  assert.equal(first.consumeResolution(5201, 430), 'perfect');
  assert.equal(first.clearIfReady(5630), false);
  assert.equal(first.clearIfReady(5631), true);
  const second = new DefenseStrike(new DefenseTiming('7', 9000, 1000, 200));
  assert.notEqual(second.timing, first.timing);
  assert.equal(second.timing.digit, '7');
});

test('failed strike cannot produce duplicate damage resolutions', () => {
  const strike = new DefenseStrike(new DefenseTiming('4', 5000, 1000, 200));
  let damageApplications = 0;
  strike.update(5201);
  strike.reachImpact(5201);
  for (const now of [5201, 5202, 5300, 5600]) {
    if (strike.consumeResolution(now, 430) === 'failed') damageApplications++;
    strike.update(now);
  }
  assert.equal(damageApplications, 1);
});

test('random selection uses only learned equipped affordable spells at current rank', () => {
  const state = createPlayerState(CLASSES.mage);
  state.deckAbilityIds = ['spark', 'fireball', 'judgment'];
  state.abilityLevels.fireball = 3;
  state.selectedAbilityRanks.fireball = 3;
  assert.equal(selectDeckSpell(state, 'spark', () => 0).word.full, 'ignisinferno');
  for (let i = 0; i < 20; i++) assert.notEqual(selectDeckSpell(state, null, () => i / 20).ability.id, 'judgment');
  state.resource = 0;
  assert.equal(selectDeckSpell(state, 'spark').ability.id, 'spark');
  state.deckAbilityIds = ['fireball'];
  assert.equal(selectDeckSpell(state, null), null);
  state.resource = 60;
  assert.equal(selectDeckSpell(state, 'fireball').ability.id, 'fireball');
  state.deckAbilityIds = [];
  assert.equal(selectDeckSpell(state, null), null);
});

test('selected upgraded word completes immediately; digits preserve partial input', () => {
  const state = createPlayerState(CLASSES.mage);
  state.deckAbilityIds = ['fireball']; state.abilityLevels.fireball = 3; state.selectedAbilityRanks.fireball = 3;
  const spell = selectDeckSpell(state, null);
  const parser = new TypingParser();
  parser.select(spell);
  assert.equal(parser.key('z', 0).type, 'miss');
  assert.equal(parser.typed, 0);
  let result;
  [...spell.word.full].forEach((letter, index) => {
    result = parser.key(letter, 100 + index * 130);
    parser.key('7', 110 + index * 130);
    assert.equal(parser.typed, index + 1);
  });
  assert.equal(result.type, 'complete');
  assert.equal(result.stats.typed, 12);
  assert.equal(parser.key('a', 2000).type, 'noop');
  parser.reset();
  assert.equal(parser.active, null);
  assert.equal(parser.typed, 0);
});


test('upgraded spells can cast an older unlocked rank selected in the deck', () => {
  const state = createPlayerState(CLASSES.mage);
  const fireball = CLASSES.mage.abilities.find((ability) => ability.id === 'fireball');
  state.abilityLevels.fireball = 3;
  state.selectedAbilityRanks.fireball = 3;
  state.deckAbilityIds = ['fireball'];
  assert.equal(selectedAbilityRank(state, fireball), 3);
  assert.equal(selectAbilityRank(state, fireball, 1), true);
  assert.equal(selectedAbilityRank(state, fireball), 1);
  const spell = selectDeckSpell(state, null, () => 0);
  assert.equal(spell.rank, 1);
  assert.equal(spell.word.full, 'ignis');
  assert.equal(selectAbilityRank(state, fireball, 4), false);
  assert.equal(selectedAbilityRank(state, fireball), 1);
});
