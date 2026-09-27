import Phaser from 'phaser';
import { abilityPower, buildWord } from '../systems/CombatMath';
import { GameEvents, events } from '../systems/EventBus';
import { gainXp } from '../systems/Progression';
import { TypingParser, type TypingStats } from '../systems/TypingParser';
import type { PlayerState, SpellCandidate } from '../types';
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

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly state: PlayerState,
    private readonly onFinished: (victory: boolean) => void,
  ) {}

  start(enemy: Enemy): void {
    if (this.active || enemy.defeated) return;
    this.active = true; this.enemy = enemy; this.timer = enemy.definition.interval; this.guard = 0; this.logs = [];
    this.player.setControl(false); enemy.setVelocity(0, 0);
    this.refreshCandidates();
    this.log(`${enemy.definition.name} emerges from the undergrowth.`, 'plain');
    events.emit(GameEvents.battleStarted, this.snapshot());
  }

  update(deltaSeconds: number): void {
    if (!this.active) return;
    this.state.resource = Math.min(this.state.maxResource, this.state.resource + this.state.classDef.resource.regen * deltaSeconds);
    this.timer -= deltaSeconds;
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
    this.parser.reset(); this.refreshCandidates(); this.emitChange();
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

  private refreshCandidates(): void {
    this.parser.setCandidates(this.state.classDef.abilities.map((ability) => ({
      ability,
      word: buildWord(ability, this.state.abilityLevels[ability.id]),
      affordable: this.state.resource >= ability.cost,
    })));
  }

  private cast(candidate: SpellCandidate, tier: number, stats: TypingStats): void {
    const { ability } = candidate;
    this.state.resource = Math.max(0, this.state.resource - ability.cost);
    const power = abilityPower(ability, tier, stats.multiplier, this.state);
    this.parser.reset();
    if (ability.kind === 'heal') {
      this.state.hp = Math.min(this.state.maxHp, this.state.hp + Math.round(power));
      this.floatText(this.player.x, this.player.y - 28, `+${Math.round(power)}`, 0x78edaa);
    } else if (ability.kind === 'guard') {
      this.guard = [0.55, 0.72, 0.86][tier];
      this.floatText(this.player.x, this.player.y - 28, 'WARD', 0x8fcfff);
    } else if (ability.kind === 'focus') {
      this.state.focus = Math.min(5, this.state.focus + 2);
      this.state.resource = Math.min(this.state.maxResource, this.state.resource + this.state.maxResource * [0.35, 0.55, 0.8][tier]);
      this.floatText(this.player.x, this.player.y - 28, 'FOCUS', 0xf0bb61);
    } else {
      this.playAttackFx(ability.kind, ability.color, () => {
        if (!this.active) return;
        this.enemy.takeDamage(power);
        this.floatText(this.enemy.x, this.enemy.y - 27, `-${Math.round(power)}`, ability.color);
        if (ability.id === 'icespike') this.timer += 1.2 + tier * 0.5;
        if (this.enemy.hp <= 0) this.win();
        else this.emitChange();
      });
    }
    this.log(`${ability.name}${tier ? ` · tier ${tier + 1}` : ''} ×${stats.multiplier.toFixed(2)}`, 'good');
    this.refreshCandidates();
    events.emit(GameEvents.playerChanged, this.state);
  }

  private miscast(progress: number, expected: string, got: string): void {
    const severity = 0.05 + progress * 0.16;
    const damage = Math.max(2, Math.round(this.state.maxHp * severity));
    this.state.hp = Math.max(0, this.state.hp - damage);
    if (this.state.classDef.id === 'samurai') this.state.focus = 0;
    this.parser.reset(); this.refreshCandidates();
    this.player.setTintFill(0xff707d); this.scene.time.delayedCall(100, () => this.player.clearTint());
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
    this.player.setTintFill(0xff7a75); this.scene.time.delayedCall(100, () => this.player.clearTint());
    this.floatText(this.player.x, this.player.y - 28, `-${damage}`, 0xff5f6d);
    this.log(reduction ? `Ward absorbed ${Math.round(reduction * 100)}% of the strike.` : `${this.enemy.definition.name} strikes.`, reduction ? 'good' : 'bad');
    events.emit(GameEvents.playerChanged, this.state);
    if (this.state.hp <= 0) this.lose();
  }

  private playAttackFx(kind: string, color: number, onHit: () => void): void {
    if (kind === 'ranged') {
      const orb = this.scene.add.image(this.player.x, this.player.y - 14, 'spell-orb').setDepth(45).setTint(color);
      this.scene.tweens.add({ targets: orb, x: this.enemy.x, y: this.enemy.y - 10, duration: 250, ease: 'Quad.easeIn', onComplete: () => { orb.destroy(); onHit(); } });
    } else {
      const slash = this.scene.add.rectangle(this.enemy.x - 7, this.enemy.y - 11, 3, 34, color, 0.9).setDepth(45).setRotation(-0.75);
      this.scene.tweens.add({ targets: slash, x: this.enemy.x + 8, alpha: 0, duration: 160, onComplete: () => { slash.destroy(); onHit(); } });
    }
  }

  private floatText(x: number, y: number, text: string, color: number): void {
    const label = this.scene.add.text(x, y, text, { fontFamily: 'monospace', fontSize: '9px', color: `#${color.toString(16).padStart(6, '0')}`, stroke: '#07120d', strokeThickness: 3 }).setOrigin(0.5).setDepth(60);
    this.scene.tweens.add({ targets: label, y: y - 13, alpha: 0, duration: 700, onComplete: () => label.destroy() });
  }

  private win(): void {
    this.active = false; this.enemy.defeat();
    const levels = gainXp(this.state, this.enemy.definition.xp);
    if (this.enemy.definition.unlock) this.state.unlocks[this.enemy.definition.unlock] = true;
    events.emit(GameEvents.playerChanged, this.state);
    events.emit(GameEvents.battleEnded, { victory: true, xp: this.enemy.definition.xp, levels });
    this.scene.time.delayedCall(450, () => this.onFinished(true));
  }

  private lose(): void {
    this.active = false;
    events.emit(GameEvents.battleEnded, { victory: false, xp: 0, levels: [] });
    this.scene.time.delayedCall(450, () => this.onFinished(false));
  }

  private log(text: string, tone: 'good' | 'bad' | 'plain'): void {
    this.logs.unshift({ text, tone }); this.logs = this.logs.slice(0, 5);
  }

  private emitChange(): void { if (this.active) events.emit(GameEvents.battleChanged, this.snapshot()); }
}
