import { cpsFrom, speedMultiplier } from './CombatMath';
import type { SpellCandidate } from '../types';

export type TypingEvent =
  | { type: 'noop' }
  | { type: 'poor'; candidate: SpellCandidate }
  | { type: 'start' | 'progress'; candidate: SpellCandidate }
  | { type: 'complete'; candidate: SpellCandidate; tier: number; stats: TypingStats }
  | { type: 'miss'; candidate: SpellCandidate; progress: number; expected: string; got: string };

export interface TypingStats { typed: number; cps: number | null; multiplier: number }

export class TypingParser {
  candidates: SpellCandidate[] = [];
  active: SpellCandidate | null = null;
  typed = 0;
  private times: number[] = [];

  reset(): void { this.active = null; this.typed = 0; this.times = []; }
  setCandidates(candidates: SpellCandidate[]): void { this.candidates = candidates; }

  key(character: string, now: number): TypingEvent {
    if (!this.active) {
      const candidate = this.candidates.find((item) => item.word.full[0] === character);
      if (!candidate) return { type: 'noop' };
      if (!candidate.affordable) return { type: 'poor', candidate };
      this.active = candidate; this.typed = 1; this.times = [now];
      if (candidate.word.full.length === 1) return { type: 'complete', candidate, tier: 0, stats: this.stats() };
      return { type: 'start', candidate };
    }
    const word = this.active.word.full;
    if (character !== word[this.typed]) {
      return { type: 'miss', candidate: this.active, progress: this.typed / word.length, expected: word[this.typed], got: character };
    }
    this.typed += 1; this.times.push(now);
    if (this.typed === word.length) {
      return { type: 'complete', candidate: this.active, tier: this.active.word.boundaries.length - 1, stats: this.stats() };
    }
    return { type: 'progress', candidate: this.active };
  }

  release(): { candidate: SpellCandidate; tier: number; stats: TypingStats } | null {
    if (!this.active) return null;
    const tier = this.active.word.boundaries.indexOf(this.typed);
    return tier < 0 ? null : { candidate: this.active, tier, stats: this.stats() };
  }

  liveMultiplier(now: number): number {
    if (!this.active || this.times.length === 0) return 1;
    return speedMultiplier(cpsFrom([...this.times, now]));
  }

  private stats(): TypingStats {
    const cps = cpsFrom(this.times);
    return { typed: this.typed, cps, multiplier: speedMultiplier(cps) };
  }
}
