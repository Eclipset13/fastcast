import { cpsFrom, speedMultiplier } from './CombatMath';
import type { SpellCandidate } from '../types';

export interface TypingStats { typed: number; cps: number | null; multiplier: number }
export type TypingEvent =
  | { type: 'noop' }
  | { type: 'progress'; candidate: SpellCandidate }
  | { type: 'complete'; candidate: SpellCandidate; tier: number; stats: TypingStats }
  | { type: 'miss'; progress: number; expected: string; got: string };

/** One explicitly selected word. Digits and non-letter input never mutate it. */
export class TypingParser {
  active: SpellCandidate | null = null;
  typed = 0;
  private times: number[] = [];

  reset(): void { this.active = null; this.typed = 0; this.times = []; }
  select(candidate: SpellCandidate): void { this.reset(); this.active = candidate; }

  key(character: string, now: number): TypingEvent {
    const candidate = this.active;
    if (!candidate || !/^[a-z]$/.test(character) || this.typed >= candidate.word.full.length) return { type: 'noop' };
    const expected = candidate.word.full[this.typed];
    if (character !== expected) return { type: 'miss', progress: this.typed / candidate.word.full.length, expected, got: character };
    this.typed++;
    this.times.push(now);
    if (this.typed < candidate.word.full.length) return { type: 'progress', candidate };
    const cps = cpsFrom(this.times);
    return { type: 'complete', candidate, tier: candidate.word.boundaries.length - 1,
      stats: { typed: this.typed, cps, multiplier: speedMultiplier(cps) } };
  }
}
