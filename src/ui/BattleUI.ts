import type { BattleSnapshot } from '../game/combat/CombatController';
import './battle.css';

/** Persistent overlay aligned to the stage's visible viewport, never to window coordinates. */
export class BattleUI {
  private readonly root = document.createElement('section');
  private readonly hp: HTMLElement;
  private readonly name: HTMLElement;
  private readonly health: HTMLElement;
  private readonly fill: HTMLElement;
  private readonly prompt: HTMLElement;
  private readonly icon: HTMLImageElement;
  private readonly spellName: HTMLElement;
  private readonly word: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly defense: HTMLElement;
  private readonly digit: HTMLElement;
  private readonly result: HTMLElement;
  private readonly ring: SVGCircleElement;
  private readonly flash: HTMLElement;
  private spellId = -1;
  private feedbackId = -1;
  private previousState = '';
  private letters: HTMLSpanElement[] = [];

  constructor() {
    this.root.className = 'battle-overlay';
    this.root.hidden = true;
    this.root.setAttribute('aria-label', 'Typing duel');
    this.root.innerHTML = `
      <div class="battle-vignette"></div><div class="battle-damage-flash"></div>
      <section class="duel-enemy" aria-label="Enemy health">
        <strong class="duel-enemy-name"></strong>
        <div class="duel-health-track" role="progressbar" aria-label="Enemy health"><b></b></div>
        <output class="duel-health-value"></output>
      </section>
      <section class="duel-spell">
        <img class="duel-spell-icon" alt="" draggable="false">
        <strong class="duel-spell-name"></strong>
        <div class="duel-word" aria-label="Spell word"></div>
        <span class="duel-input-hint"></span>
      </section>
      <section class="duel-defense" aria-label="Timing defense" hidden>
        <span class="duel-defense-result"></span>
        <div class="duel-defense-circle">
          <svg viewBox="0 0 180 180" aria-hidden="true">
            <circle class="duel-ring-window" cx="90" cy="90" r="39"></circle>
            <circle class="duel-ring-target" cx="90" cy="90" r="30"></circle>
            <circle class="duel-ring-moving" cx="90" cy="90" r="76"></circle>
          </svg>
          <strong class="duel-defense-digit"></strong>
        </div>
        <span class="duel-defense-hint">Match the ring · press the digit</span>
      </section>`;
    document.querySelector('.stage')!.append(this.root);
    const find = <T extends Element = HTMLElement>(selector: string) => this.root.querySelector<T>(selector)!;
    this.hp = find('.duel-enemy'); this.name = find('.duel-enemy-name');
    this.health = find('.duel-health-value'); this.fill = find('.duel-health-track b');
    this.prompt = find('.duel-spell'); this.icon = find<HTMLImageElement>('.duel-spell-icon');
    this.spellName = find('.duel-spell-name'); this.word = find('.duel-word'); this.hint = find('.duel-input-hint');
    this.defense = find('.duel-defense'); this.digit = find('.duel-defense-digit');
    this.result = find('.duel-defense-result'); this.ring = find<SVGCircleElement>('.duel-ring-moving');
    this.flash = find('.battle-damage-flash');
  }

  start(snapshot: BattleSnapshot): void {
    this.spellId = this.feedbackId = -1;
    this.previousState = '';
    this.root.hidden = false;
    this.root.classList.remove('is-ending');
    this.root.closest('.stage')!.classList.add('in-battle');
    this.update(snapshot);
  }

  update(snapshot: BattleSnapshot): void {
    this.root.classList.toggle('is-revealed', snapshot.revealed);
    this.hp.setAttribute('aria-hidden', String(!snapshot.revealed));
    this.name.textContent = snapshot.enemyName;
    this.health.textContent = Math.ceil(snapshot.enemyHp) + ' / ' + snapshot.enemyMaxHp;
    this.fill.style.width = Math.max(0, snapshot.enemyHp / snapshot.enemyMaxHp * 100) + '%';
    const track = this.fill.parentElement!;
    track.setAttribute('aria-valuenow', String(Math.ceil(snapshot.enemyHp)));
    track.setAttribute('aria-valuemin', '0'); track.setAttribute('aria-valuemax', String(snapshot.enemyMaxHp));
    this.prompt.hidden = !snapshot.revealed;
    if (snapshot.spell && snapshot.spellId !== this.spellId) {
      this.spellId = snapshot.spellId;
      this.spellName.textContent = snapshot.spell.ability.name;
      this.icon.hidden = !snapshot.spell.ability.assetPath;
      if (snapshot.spell.ability.assetPath) this.icon.src = snapshot.spell.ability.assetPath;
      this.prompt.style.setProperty('--spell-color', '#' + snapshot.spell.ability.color.toString(16).padStart(6, '0'));
      this.word.style.setProperty('--letter-count', String(snapshot.spell.word.full.length));
      this.word.setAttribute('aria-label', snapshot.spell.word.full);
      this.letters = [...snapshot.spell.word.full.toUpperCase()].map((character) => {
        const span = document.createElement('span');
        span.textContent = character; span.setAttribute('aria-hidden', 'true');
        return span;
      });
      this.word.replaceChildren(...this.letters);
      this.animate(this.word, [{ opacity: 0, translate: '0 6px' }, { opacity: 1, translate: '0 0' }], 160);
    }
    this.prompt.dataset.state = snapshot.spellState;
    if (snapshot.spell) {
      this.letters.forEach((span, i) => {
        const typed = i < snapshot.typed;
        if (typed && !span.classList.contains('is-typed')) this.animate(span, [{ scale: '1.14' }, { scale: '1' }], 100);
        span.classList.toggle('is-typed', typed);
        span.classList.toggle('is-next', i === snapshot.typed && snapshot.spellState === 'typing');
        span.classList.toggle('is-wrong', i === snapshot.typed && snapshot.spellState === 'miscast');
        span.textContent = i === snapshot.typed && snapshot.spellState === 'miscast'
          ? snapshot.wrongLetter.toUpperCase() : snapshot.spell!.word.full[i].toUpperCase();
      });
    } else {
      this.word.replaceChildren(); this.letters = [];
      this.spellName.textContent = ''; this.icon.hidden = true;
    }
    this.hint.textContent = snapshot.spellState === 'waiting' ? snapshot.waitingText
      : snapshot.spellState === 'miscast' ? 'MISCAST' : snapshot.spellState === 'cast' ? ''
      : snapshot.phase === 'entering' ? 'Ready…' : 'Type to cast';
    if (snapshot.spellState !== this.previousState) {
      if (snapshot.spellState === 'cast') {
        this.animate(this.word, [{ scale: '1', filter: 'brightness(2.5)', opacity: 1 },
          { scale: '1.045', filter: 'brightness(1.2)', opacity: 0 }], 260);
        this.animate(this.icon, [{ filter: 'brightness(3)' }, { filter: 'brightness(1)', opacity: 0 }], 250);
      } else if (snapshot.spellState === 'miscast') {
        this.animate(this.word, [{ translate: '-7px 0', opacity: 1 }, { translate: '7px -2px', offset: 0.2 },
          { translate: '-5px 2px', offset: 0.35 }, { translate: '4px 0', offset: 0.5 }, { translate: '0 0', opacity: 0 }], 340);
      }
      this.previousState = snapshot.spellState;
    }
    this.defense.hidden = !snapshot.defense;
    if (snapshot.defense) {
      const qte = snapshot.defense;
      this.defense.dataset.result = qte.result;
      this.defense.classList.toggle('in-window', qte.inWindow);
      this.digit.textContent = qte.digit;
      this.defense.setAttribute('aria-label', 'Defense: press ' + qte.digit + ' when the rings meet');
      this.ring.setAttribute('r', String(qte.result === 'pending' ? 76 - 46 * qte.progress : 30));
      this.result.textContent = qte.result === 'perfect' ? 'PERFECT' : qte.result === 'failed' ? 'CRITICAL' : qte.inWindow ? 'NOW' : '';
    }
    if (snapshot.feedbackId !== this.feedbackId) {
      this.feedbackId = snapshot.feedbackId;
      if (snapshot.feedback === 'miscast' || snapshot.feedback === 'critical') {
        this.animate(this.flash, [{ opacity: snapshot.feedback === 'critical' ? 1 : 0.7 }, { opacity: 0 }], 400);
      }
    }
  }

  private animate(element: HTMLElement, keyframes: Keyframe[], duration: number): void {
    element.getAnimations().forEach((animation) => animation.cancel());
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.animate(keyframes, { duration: reduced ? Math.min(80, duration) : duration, easing: 'ease-out' });
  }

  end(): void {
    this.root.classList.add('is-ending');
    this.defense.hidden = true;
    this.prompt.hidden = true;
  }

  clear(): void {
    this.root.hidden = true;
    this.root.classList.remove('is-revealed', 'is-ending');
    this.root.closest('.stage')!.classList.remove('in-battle');
    this.root.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
    this.word.replaceChildren(); this.letters = [];
    this.icon.removeAttribute('src');
    this.defense.hidden = true;
  }
}
