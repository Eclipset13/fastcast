import Phaser from 'phaser';
import { abilityPower, buildWord } from '../systems/CombatMath';
import { GameEvents, events } from '../systems/EventBus';
import { gainXp } from '../systems/Progression';
import { TypingParser, type TypingStats } from '../systems/TypingParser';
import type { AbilityDefinition, PlayerState, SpellCandidate } from '../types';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';

export interface BattleSnapshot {
  enemyName: string;
  enemyHp: number;
  enemyMaxHp: number;
  timer: number;
  timerMax: number;
  candidates: SpellCandidate[];
  activeWord: string | null;
  typed: number;
  speedMultiplier: number;
  logs: Array<{ text: string; tone: 'good' | 'bad' | 'plain' }>;
}

export class CombatController {
  readonly parser = new TypingParser();
  active = false;
  private timer = 0;
  private guard = 0;
  private enemy!: Enemy;
  private logs: BattleSnapshot['logs'] = [];
  private dotDamage = 0;
  private dotTicks = 0;
  private dotClock = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly state: PlayerState,
    private readonly onFinished: (victory: boolean) => void,
  ) {}

  start(enemy: Enemy): void {
    if (this.active || enemy.defeated) return;
    this.active = true;
    this.enemy = enemy;
    this.timer = enemy.definition.interval;
    this.guard = 0;
    this.dotDamage = 0;
    this.dotTicks = 0;
    this.dotClock = 0;
    this.logs = [];
    this.player.setControl(false);
    enemy.setVelocity(0, 0);
    this.refreshCandidates();
    this.log(`${enemy.definition.name} emerges from the undergrowth.`, 'plain');
    events.emit(GameEvents.battleStarted, this.snapshot());
  }

  update(deltaSeconds: number): void {
    if (!this.active) return;
    this.state.resource = Math.min(this.state.maxResource, this.state.resource + this.state.classDef.resource.regen * deltaSeconds);
    this.timer -= deltaSeconds;
    this.updateDamageOverTime(deltaSeconds);
    if (!this.active) return;
    if (this.timer <= 0) this.enemyStrike();
    this.emitChange();
  }

  handleKey(event: KeyboardEvent): boolean {
    if (!this.active) return false;
    if (event.code === 'Space' || event.code === 'Enter') { this.release(); return true; }
    if (event.code === 'Escape') { this.abort(); return true; }
    const letter = /^Key([A-Z])$/.exec(event.code)?.[1].toLowerCase();
    if (!letter) return false;
    const result = this.parser.key(letter, performance.now());
    if (result.type === 'poor') this.log(`Not enough ${this.state.classDef.resource.name}.`, 'bad');
    else if (result.type === 'miss') this.miscast(result.progress, result.expected, result.got);
    else if (result.type === 'complete') this.cast(result.candidate, result.tier, result.stats);
    this.emitChange();
    return true;
  }

  release(): void {
    const result = this.parser.release();
    if (result) this.cast(result.candidate, result.tier, result.stats);
    this.emitChange();
  }

  abort(): void {
    if (!this.parser.active) return;
    const cost = Math.ceil(this.parser.active.ability.cost * 0.5);
    this.state.resource = Math.max(0, this.state.resource - cost);
    this.log(`Cast cancelled. ${cost} resource lost.`, 'bad');
    this.parser.reset();
    this.refreshCandidates();
    this.emitChange();
  }

  snapshot(): BattleSnapshot {
    return {
      enemyName: this.enemy.definition.name,
      enemyHp: this.enemy.hp,
      enemyMaxHp: this.enemy.definition.hp,
      timer: Math.max(0, this.timer),
      timerMax: this.enemy.definition.interval,
      candidates: this.parser.candidates,
      activeWord: this.parser.active?.word.full ?? null,
      typed: this.parser.typed,
      speedMultiplier: this.parser.liveMultiplier(performance.now()),
      logs: [...this.logs],
    };
  }

  private deckAbilities(): AbilityDefinition[] {
    return this.state.deckAbilityIds
      .map((id) => this.state.classDef.abilities.find((ability) => ability.id === id))
      .filter((ability): ability is AbilityDefinition => Boolean(ability));
  }

  private refreshCandidates(): void {
    this.parser.setCandidates(this.deckAbilities().map((ability) => ({
      ability,
      word: buildWord(ability, this.state.abilityLevels[ability.id]),
      affordable: this.state.resource >= ability.cost,
    })));
  }

  private cast(candidate: SpellCandidate, tier: number, stats: TypingStats): void {
    const { ability } = candidate;
    const level = this.state.abilityLevels[ability.id] ?? 1;
    const rankIndex = Math.max(0, level - 1);
    this.state.resource = Math.max(0, this.state.resource - ability.cost);
    const power = abilityPower(ability, tier, stats.multiplier, this.state);
    this.parser.reset();

    if (ability.id === 'hourglass') {
      this.timer += [1.8, 2.6, 3.5][rankIndex] ?? 1.8;
      this.floatText(this.enemy.x, this.enemy.y - 28, 'SLOWED', ability.color);
    } else if (ability.id === 'ascend') {
      this.timer += [1.0, 1.8][rankIndex] ?? 1;
      this.floatText(this.player.x, this.player.y - 28, 'ASCEND', ability.color);
    } else if (ability.id === 'astral-bloom') {
      const amount = Math.max(1, Math.round(power));
      this.state.hp = Math.min(this.state.maxHp, this.state.hp + amount);
      this.playAttackFx('ranged', ability.color, () => {
        if (!this.active) return;
        this.enemy.takeDamage(amount);
        this.floatText(this.enemy.x, this.enemy.y - 27, `-${amount}`, ability.color);
        if (this.enemy.hp <= 0) this.win();
        else this.emitChange();
      });
      this.floatText(this.player.x, this.player.y - 28, `+${amount}`, 0xff8fda);
    } else if (ability.kind === 'heal') {
      this.state.hp = Math.min(this.state.maxHp, this.state.hp + Math.round(power));
      this.floatText(this.player.x, this.player.y - 28, `+${Math.round(power)}`, 0x78edaa);
    } else if (ability.kind === 'guard') {
      const guardValues = ability.id === 'phase' ? [0.60, 0.85] : [0.45, 0.62, 0.78];
      this.guard = guardValues[rankIndex] ?? guardValues.at(-1)!;
      this.floatText(this.player.x, this.player.y - 28, ability.id === 'phase' ? 'PHASE' : 'WARD', ability.color);
    } else if (ability.kind === 'focus') {
      this.state.focus = Math.min(5, this.state.focus + 2);
      this.state.resource = Math.min(this.state.maxResource, this.state.resource + this.state.maxResource * [0.35, 0.55, 0.8][Math.min(rankIndex, 2)]);
      this.floatText(this.player.x, this.player.y - 28, 'FOCUS', 0xf0bb61);
    } else {
      this.playAttackFx(ability.kind, ability.color, () => {
        if (!this.active) return;
        this.enemy.takeDamage(power);
        this.floatText(this.enemy.x, this.enemy.y - 27, `-${Math.round(power)}`, ability.color);
        this.applySecondaryEffect(ability, rankIndex);
        if (this.enemy.hp <= 0) this.win();
        else this.emitChange();
      });
    }

    if (ability.id === 'blood-crescent') {
      const selfDamage = [4, 5, 6][rankIndex] ?? 4;
      this.state.hp = Math.max(1, this.state.hp - selfDamage);
      this.floatText(this.player.x, this.player.y - 26, `-${selfDamage}`, 0xff6572);
    }

    this.log(`${ability.name} · rank ${level} ×${stats.multiplier.toFixed(2)}`, 'good');
    this.refreshCandidates();
    events.emit(GameEvents.playerChanged, this.state);
  }

  private applySecondaryEffect(ability: AbilityDefinition, rankIndex: number): void {
    if (ability.id === 'ice-spike') this.timer += [0.8, 1.2, 1.7][rankIndex] ?? 0.8;
    else if (ability.id === 'void-rift') this.timer += [0.7, 1.0, 1.4][rankIndex] ?? 0.7;
    else if (ability.id === 'arcane-bind') this.timer += [1.0, 1.7, 2.5][rankIndex] ?? 1;
    else if (ability.id === 'gale') this.timer += [0.5, 0.9, 1.3][rankIndex] ?? 0.5;
    else if (ability.id === 'venom') this.applyDot([6, 10, 16][rankIndex] ?? 6);
    else if (ability.id === 'soulflame') this.applyDot([6, 10, 16][rankIndex] ?? 6);
  }

  private applyDot(totalDamage: number): void {
    this.dotTicks = 4;
    this.dotDamage = totalDamage / this.dotTicks;
    this.dotClock = 0.55;
  }

  private updateDamageOverTime(deltaSeconds: number): void {
    if (this.dotTicks <= 0) return;
    this.dotClock -= deltaSeconds;
    if (this.dotClock > 0) return;
    this.dotClock = 0.55;
    this.dotTicks -= 1;
    const damage = Math.max(1, Math.round(this.dotDamage));
    this.enemy.takeDamage(damage);
    this.floatText(this.enemy.x, this.enemy.y - 18, `-${damage}`, 0x9fe45c);
    if (this.enemy.hp <= 0) this.win();
  }

  private miscast(progress: number, expected: string, got: string): void {
    const severity = 0.05 + progress * 0.16;
    const damage = Math.max(2, Math.round(this.state.maxHp * severity));
    this.state.hp = Math.max(0, this.state.hp - damage);
    if (this.state.classDef.id === 'samurai') this.state.focus = 0;
    this.parser.reset();
    this.refreshCandidates();
    this.player.setTintFill(0xff707d);
    this.scene.time.delayedCall(100, () => this.player.clearTint());
    this.floatText(this.player.x, this.player.y - 28, `-${damage}`, 0xff5f6d);
    this.log(`Miscast: expected “${expected}”, got “${got}”.`, 'bad');
    events.emit(GameEvents.playerChanged, this.state);
    if (this.state.hp <= 0) this.lose();
  }

  private enemyStrike(): void {
    this.timer = this.enemy.definition.interval;
    const reduction = this.guard;
    this.guard = 0;
    const damage = Math.max(1, Math.round(this.enemy.definition.attack * (1 - reduction)));
    this.state.hp = Math.max(0, this.state.hp - damage);
    this.scene.cameras.main.shake(90, 0.006);
    this.player.setTintFill(0xff7a75);
    this.scene.time.delayedCall(100, () => this.player.clearTint());
    this.floatText(this.player.x, this.player.y - 28, `-${damage}`, 0xff5f6d);
    this.log(reduction ? `Ward absorbed ${Math.round(reduction * 100)}% of the strike.` : `${this.enemy.definition.name} strikes.`, reduction ? 'good' : 'bad');
    events.emit(GameEvents.playerChanged, this.state);
    if (this.state.hp <= 0) this.lose();
  }

  private playAttackFx(kind: string, color: number, onHit: () => void): void {
    if (kind === 'ranged' || kind === 'hybrid' || kind === 'utility') {
      const orb = this.scene.add.image(this.player.x, this.player.y - 14, 'spell-orb').setDepth(45).setTint(color);
      this.scene.tweens.add({ targets: orb, x: this.enemy.x, y: this.enemy.y - 10, duration: 250, ease: 'Quad.easeIn', onComplete: () => { orb.destroy(); onHit(); } });
    } else {
      const slash = this.scene.add.rectangle(this.enemy.x - 7, this.enemy.y - 11, 3, 34, color, 0.9).setDepth(45).setRotation(-0.75);
      this.scene.tweens.add({ targets: slash, x: this.enemy.x + 8, alpha: 0, duration: 160, onComplete: () => { slash.destroy(); onHit(); } });
    }
  }

  private floatText(x: number, y: number, text: string, color: number): void {
    const label = this.scene.add.text(x, y, text, {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#07120d',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(60);
    this.scene.tweens.add({ targets: label, y: y - 13, alpha: 0, duration: 700, onComplete: () => label.destroy() });
  }

  private win(): void {
    if (!this.active) return;
    this.active = false;
    this.enemy.defeat();
    const levels = gainXp(this.state, this.enemy.definition.xp);
    if (this.enemy.definition.unlock) this.state.unlocks[this.enemy.definition.unlock] = true;
    events.emit(GameEvents.playerChanged, this.state);
    events.emit(GameEvents.battleEnded, { victory: true, xp: this.enemy.definition.xp, levels });
    this.scene.time.delayedCall(450, () => this.onFinished(true));
  }

  private lose(): void {
    if (!this.active) return;
    this.active = false;
    events.emit(GameEvents.battleEnded, { victory: false, xp: 0, levels: [] });
    this.scene.time.delayedCall(450, () => this.onFinished(false));
  }

  private log(text: string, tone: 'good' | 'bad' | 'plain'): void {
    this.logs.unshift({ text, tone });
    this.logs = this.logs.slice(0, 5);
  }

  private emitChange(): void {
    if (this.active) events.emit(GameEvents.battleChanged, this.snapshot());
  }
}
