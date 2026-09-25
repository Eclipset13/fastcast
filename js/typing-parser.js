/* TypingParser — принимает буквы, ведёт прогресс по слову и замеряет время между нажатиями. */

class TypingParser {
  constructor() { this.candidates = []; this.reset(); }
  reset() { this.active = null; this.typed = 0; this.times = []; }
  setCandidates(list) { this.candidates = list; }  // [{ ability, word:{full,bounds}, affordable }]
  get isActive() { return !!this.active; }

  /* Возвращает событие: noop | poor | start | progress | complete | miss */
  key(ch, now) {
    if (!this.active) {
      const c = this.candidates.find(c => c.word.full[0] === ch);
      if (!c) return { type: 'noop' };
      if (!c.affordable) return { type: 'poor', cand: c };
      this.active = c; this.typed = 1; this.times = [now];
      return { type: 'start', cand: c };
    }
    const full = this.active.word.full;
    if (ch === full[this.typed]) {
      this.typed++; this.times.push(now);
      if (this.typed === full.length) return { type: 'complete', cand: this.active, tier: this.active.word.bounds.length - 1, stats: this.stats(now) };
      return { type: 'progress', cand: this.active };
    }
    return { type: 'miss', cand: this.active, progress: this.typed / full.length, at: this.typed, expected: full[this.typed], got: ch };
  }

  /* Пробел/Enter: выпустить приём на границе сегмента. */
  release(now) {
    if (!this.active) return null;
    const tier = this.active.word.bounds.indexOf(this.typed);
    if (tier < 0) return null;
    return { cand: this.active, tier, stats: this.stats(now) };
  }

  stats(now) {
    const cps = CombatMath.cpsFrom(this.times);
    return { typed: this.typed, cps, mult: CombatMath.speedMult(cps), elapsed: this.times.length ? now - this.times[0] : 0 };
  }

  /* «Живая» оценка множителя: как если бы следующая буква была нажата прямо сейчас. */
  liveMult(now) {
    if (!this.active || this.times.length === 0) return null;
    if (this.times.length === 1 && now - this.times[0] < 250) return null;
    return CombatMath.speedMult(CombatMath.cpsFrom([...this.times, now]));
  }
}
