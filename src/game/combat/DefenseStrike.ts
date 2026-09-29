import { DefenseTiming, type DefenseResult } from './DefenseTiming';

export type DefenseStrikePhase =
  | 'warning'
  | 'resolved-waiting-impact'
  | 'showing-result'
  | 'complete';

/** Owns one immutable QTE from warning through the authored attack impact. */
export class DefenseStrike {
  phase: DefenseStrikePhase = 'warning';
  private impactReached = false;
  private applied = false;
  private clearAt = Infinity;

  constructor(readonly timing: DefenseTiming) {}

  get result(): DefenseResult { return this.timing.result; }
  get isApplied(): boolean { return this.applied; }

  press(digit: string, now: number): DefenseResult {
    const result = this.timing.press(digit, now);
    this.noteResolution(result);
    return result;
  }

  update(now: number): DefenseResult {
    const result = this.timing.update(now);
    this.noteResolution(result);
    return result;
  }

  reachImpact(now: number): void {
    if (this.phase === 'complete') return;
    this.impactReached = true;
    this.update(now);
  }

  /** Returns a result exactly once, and only when both input resolution and impact exist. */
  consumeResolution(now: number, resultDisplayDuration: number): Exclude<DefenseResult, 'pending'> | null {
    if (!this.impactReached || this.applied || this.timing.result === 'pending') return null;
    this.applied = true;
    this.phase = 'showing-result';
    this.clearAt = now + resultDisplayDuration;
    return this.timing.result;
  }

  clearIfReady(now: number): boolean {
    if (this.phase !== 'showing-result' || now < this.clearAt) return false;
    this.phase = 'complete';
    return true;
  }

  private noteResolution(result: DefenseResult): void {
    if (result !== 'pending' && this.phase === 'warning') this.phase = 'resolved-waiting-impact';
  }
}
