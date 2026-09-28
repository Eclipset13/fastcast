import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

// Vite loads the same TypeScript modules used in-game; no separate test implementation.
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
after(() => server.close());
const { DefenseTiming } = await server.ssrLoadModule('/src/game/combat/DefenseTiming.ts');
const { TypingParser } = await server.ssrLoadModule('/src/game/systems/TypingParser.ts');
const { selectDeckSpell } = await server.ssrLoadModule('/src/game/combat/SpellSelection.ts');
const { createPlayerState } = await server.ssrLoadModule('/src/game/systems/Progression.ts');
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

test('random selection uses only learned equipped affordable spells at current rank', () => {
  const state = createPlayerState(CLASSES.mage);
  state.deckAbilityIds = ['spark', 'fireball', 'judgment'];
  state.abilityLevels.fireball = 3;
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
  state.deckAbilityIds = ['fireball']; state.abilityLevels.fireball = 3;
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
