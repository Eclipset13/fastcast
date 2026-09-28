export type DefenseResult = 'pending' | 'perfect' | 'failed';

/** All deadlines use the scene clock, in milliseconds. No independent timers. */
export class DefenseTiming {
  result: DefenseResult = 'pending';
  constructor(readonly digit: string, readonly targetAt: number,
    readonly warningDuration: number, readonly perfectWindow: number) {}

  get startsAt(): number { return this.targetAt - this.warningDuration; }
  get expiresAt(): number { return this.targetAt + this.perfectWindow; }
  progress(now: number): number { return Math.max(0, Math.min(1, (now - this.startsAt) / this.warningDuration)); }
  inWindow(now: number): boolean { return Math.abs(now - this.targetAt) <= this.perfectWindow; }
  press(digit: string, now: number): DefenseResult {
    if (this.result === 'pending') this.result = digit === this.digit && this.inWindow(now) ? 'perfect' : 'failed';
    return this.result;
  }
  update(now: number): DefenseResult {
    if (this.result === 'pending' && now > this.expiresAt) this.result = 'failed';
    return this.result;
  }
}
