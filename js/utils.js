/* Utils / Sfx — утилиты, детерминированный генератор и простые звуки через WebAudio. */

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const R = Math.round;
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const Sfx = {
  ctx: null,
  init() { if (this.ctx) return; try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* без звука */ } },
  tone(freq, dur = 0.06, type = 'square', gain = 0.04) {
    if (!this.ctx) return;
    try {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(gain, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
      o.connect(g).connect(this.ctx.destination); o.start(); o.stop(this.ctx.currentTime + dur);
    } catch (e) { /* ignore */ }
  },
  key(i) { this.tone(520 + i * 28, 0.045, 'square', 0.03); },
  miss() { this.tone(120, 0.3, 'sawtooth', 0.07); },
  cast() { this.tone(880, 0.12, 'triangle', 0.06); },
  hit() { this.tone(200, 0.1, 'square', 0.05); },
  hurt() { this.tone(90, 0.2, 'sawtooth', 0.06); },
  jump() { this.tone(300, 0.08, 'triangle', 0.03); },
  dash() { this.tone(700, 0.1, 'sawtooth', 0.03); },
};
