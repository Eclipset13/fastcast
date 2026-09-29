import Phaser from 'phaser';
import { COMBAT_TUNING as T } from '../config/constants';
import { abilityPower } from '../systems/CombatMath';
import { GameEvents, events } from '../systems/EventBus';
import { gainXp } from '../systems/Progression';
import { TypingParser, type TypingStats } from '../systems/TypingParser';
import type { AbilityDefinition, PlayerState, SpellCandidate } from '../types';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import { BattlePresentation } from './BattlePresentation';
import { DefenseTiming, type DefenseResult } from './DefenseTiming';
import { DefenseStrike } from './DefenseStrike';
import { selectDeckSpell } from './SpellSelection';

export interface BattleSnapshot {
  phase: 'entering' | 'fighting' | 'ending';
  revealed: boolean;
  enemyName: string;
  enemyHp: number;
  enemyMaxHp: number;
  spell: SpellCandidate | null;
  spellId: number;
  spellState: 'typing' | 'cast' | 'miscast' | 'waiting';
  typed: number;
  wrongLetter: string;
  waitingText: string;
  defense: { digit: string; progress: number; inWindow: boolean; result: DefenseResult } | null;
  feedbackId: number;
  feedback: 'none' | 'miscast' | 'critical' | 'perfect';
}

export class CombatController {
  readonly parser = new TypingParser();
  readonly presentation: BattlePresentation;
  active = false;
  private phase: BattleSnapshot['phase'] = 'entering';
  private enemy!: Enemy;
  private enteredAt = 0;
  private nextSpellAt = 0;
  private nextAttackAt = 0;
  private pendingDelay = 0;
  private defenseStrike: DefenseStrike | null = null;
  private spellState: BattleSnapshot['spellState'] = 'waiting';
  private spellId = 0;
  private previousSpell: string | null = null;
  private wrongLetter = '';
  private feedbackId = 0;
  private feedback: BattleSnapshot['feedback'] = 'none';
  private guard = 0;
  private dotDamage = 0;
  private dotTicks = 0;
  private dotAt = 0;
  private endAt = 0;
  private restoring = false;
  private victory = false;
  private get ending(): boolean { return this.phase === 'ending'; }

  constructor(private readonly scene: Phaser.Scene, private readonly player: Player,
    private readonly state: PlayerState, private readonly onFinished: (victory: boolean) => void) {
    this.presentation = new BattlePresentation(scene, player);
  }

  start(enemy: Enemy): void {
    if (this.active || enemy.defeated) return;
    // Empty decks remain editable at the runestone, but cannot trap the player in a duel.
    if (!this.state.deckAbilityIds.some((id) => this.state.learnedAbilityIds.includes(id))) return;
    this.active = true;
    this.phase = 'entering';
    this.enemy = enemy;
    this.enteredAt = this.scene.time.now;
    this.nextSpellAt = this.enteredAt + T.revealDelay;
    this.nextAttackAt = this.enteredAt + T.inputDelay + enemy.definition.interval * 1000;
    this.defenseStrike = null;
    this.pendingDelay = this.guard = this.dotTicks = 0;
    this.previousSpell = null;
    this.feedback = 'none';
    this.spellState = 'waiting';
    this.parser.reset();
    this.restoring = false;
    this.player.setControl(false);
    this.player.setFlipX(enemy.x < this.player.x);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.moves = false;
    enemy.setCombatLocked(true, this.player.x);
    this.presentation.enter(enemy);
    events.emit(GameEvents.battleStarted, this.snapshot());
  }

  update(deltaSeconds: number): void {
    if (!this.active) return;
    const now = this.scene.time.now;
    this.presentation.update();
    if (this.phase === 'ending') {
      if (!this.restoring && now >= this.endAt) {
        this.restoring = true;
        // Respawn happens before camera restoration; control stays locked until it finishes.
        this.onFinished(this.victory);
        this.presentation.exit(() => {
          (this.player.body as Phaser.Physics.Arcade.Body).setAllowGravity(true).moves = true;
          this.enemy.setCombatLocked(false, this.player.x);
          this.scene.input.keyboard?.resetKeys();
          this.player.setControl(true);
          this.active = false;
          events.emit(GameEvents.battleExited);
        });
      }
      return;
    }
    this.state.resource = Math.min(this.state.maxResource, this.state.resource + this.state.classDef.resource.regen * deltaSeconds);
    if (now >= this.enteredAt + T.inputDelay) this.phase = 'fighting';
    if (now >= this.nextSpellAt && this.spellState !== 'typing') this.chooseSpell();
    if (this.phase === 'fighting') {
      this.updateDot(now);
      if (!this.ending) this.updateDefense(now);
    }
    if (!this.ending) this.emitChange();
  }

  handleKey(event: KeyboardEvent): boolean {
    if (!this.active || event.ctrlKey || event.metaKey || event.altKey) return false;
    const digit = /^(?:Digit|Numpad)([0-9])$/.exec(event.code)?.[1];
    const letter = /^Key([A-Z])$/.exec(event.code)?.[1].toLowerCase();
    if (!digit && !letter && !['Space', 'Enter', 'Escape', 'Backspace'].includes(event.code)) return false;
    if (event.repeat || this.phase !== 'fighting') return true;
    const now = this.scene.time.now;
    if (digit !== undefined) {
      this.updateDefense(now);
      if (this.phase === 'fighting' && this.defenseStrike?.result === 'pending') {
        this.defenseStrike.press(digit, now);
        this.applyDefenseResolution(now);
      }
    } else if (letter && this.spellState === 'typing') {
      const result = this.parser.key(letter, now);
      if (result.type === 'complete') this.cast(result.candidate, result.tier, result.stats);
      else if (result.type === 'miss') this.miscast(result.progress, result.got);
    }
    if (!this.ending) this.emitChange();
    return true;
  }

  snapshot(): BattleSnapshot {
    const now = this.scene.time.now;
    return {
      phase: this.phase, revealed: now >= this.enteredAt + T.revealDelay,
      enemyName: this.enemy.definition.name, enemyHp: this.enemy.hp, enemyMaxHp: this.enemy.definition.hp,
      spell: this.parser.active, spellId: this.spellId, spellState: this.spellState,
      typed: this.parser.typed, wrongLetter: this.wrongLetter,
      waitingText: this.state.deckAbilityIds.length ? 'Recovering mana' : 'No spells equipped',
      defense: this.defenseStrike ? { digit: this.defenseStrike.timing.digit,
        progress: this.defenseStrike.timing.progress(now),
        inWindow: this.defenseStrike.timing.inWindow(now), result: this.defenseStrike.result } : null,
      feedback: this.feedback, feedbackId: this.feedbackId,
    };
  }

  private chooseSpell(): void {
    const candidate = selectDeckSpell(this.state, this.previousSpell);
    this.parser.reset();
    this.wrongLetter = '';
    if (!candidate) { this.spellState = 'waiting'; this.nextSpellAt = this.scene.time.now + 100; return; }
    this.parser.select(candidate);
    this.previousSpell = candidate.ability.id;
    this.spellId++;
    this.spellState = 'typing';
  }

  private updateDefense(now: number): void {
    if (this.defenseStrike?.clearIfReady(now)) this.defenseStrike = null;
    const warning = (this.enemy.definition.defenseWarningDuration ?? T.defenseWarningDuration) * 1000;
    if (!this.defenseStrike && now >= this.nextAttackAt - warning) {
      const timing = new DefenseTiming(String(Phaser.Math.Between(0, 9)), this.nextAttackAt, warning,
        (this.enemy.definition.perfectWindow ?? T.perfectWindow) * 1000);
      this.defenseStrike = new DefenseStrike(timing);
      // Let the full +/- timing window remain valid, then land the authored impact pose.
      // This keeps late-but-valid defenses possible without applying damage before the club connects.
      this.enemy.prepareAttack(timing.expiresAt + 1, () => this.reachAttackImpact());
    }
    this.defenseStrike?.update(now);
    this.applyDefenseResolution(now);
  }

  private reachAttackImpact(): void {
    if (!this.active || this.ending) return;
    const now = this.scene.time.now;
    this.defenseStrike?.reachImpact(now);
    this.applyDefenseResolution(now);
  }

  private applyDefenseResolution(now: number): void {
    const result = this.defenseStrike?.consumeResolution(now, 430);
    if (!result) return;
    this.nextAttackAt = now + this.enemy.definition.interval * 1000 + this.pendingDelay;
    this.pendingDelay = 0;
    if (result === 'perfect') { this.presentation.parry(); this.signal('perfect'); }
    else {
      const multiplier = this.enemy.definition.criticalMultiplier ?? T.criticalMultiplier;
      const damage = Math.max(1, Math.round(this.enemy.definition.attack * multiplier * (1 - this.guard)));
      this.guard = 0;
      this.hurt(damage, true);
    }
  }

  private delayAttack(seconds: number): void {
    // Never move an already advertised timing target. Delays apply to the following strike.
    if (this.defenseStrike && !this.defenseStrike.isApplied) this.pendingDelay += seconds * 1000;
    else this.nextAttackAt += seconds * 1000;
  }

  private cast(candidate: SpellCandidate, tier: number, stats: TypingStats): void {
    const { ability } = candidate;
    if (this.state.resource < ability.cost) {
      this.parser.reset(); this.spellState = 'waiting'; this.nextSpellAt = this.scene.time.now + 100; return;
    }
    this.spellState = 'cast';
    this.nextSpellAt = this.scene.time.now + T.nextSpellDelay;
    this.state.resource -= ability.cost;
    const rank = Math.max(0, (this.state.abilityLevels[ability.id] ?? 1) - 1);
    const power = Math.max(0, Math.round(abilityPower(ability, tier, stats.multiplier, this.state)));
    this.presentation.cast(ability, this.enemy, () => {
      if (!this.active || this.ending) return;
      this.applySpellEffect(ability, rank, power);
      events.emit(GameEvents.playerChanged, this.state);
      this.emitChange();
      if (this.enemy.hp <= 0) this.finish(true);
    });
    if (ability.id === 'blood-crescent') {
      const amount = Math.min(this.state.hp - 1, [4, 5, 6][rank] ?? 4);
      this.state.hp -= amount;
      this.presentation.floatText(this.player.x, this.player.y - 28, '-' + amount, 0xff6572);
    }
    // Mana and self-cost update immediately; projectile damage lands with the visual impact.
    events.emit(GameEvents.playerChanged, this.state);
    this.emitChange();
  }

  private applySpellEffect(ability: AbilityDefinition, rank: number, power: number): void {
    if (ability.id === 'hourglass') this.delayAttack([1.8, 2.6, 3.5][rank] ?? 1.8);
    else if (ability.id === 'ascend') this.delayAttack([1, 1.8][rank] ?? 1);
    else if (ability.kind === 'heal') this.heal(power, ability.color);
    else if (ability.kind === 'guard') {
      const values = ability.id === 'phase' ? [0.6, 0.85] : [0.45, 0.62, 0.78];
      this.guard = values[rank] ?? values.at(-1)!;
      this.presentation.floatText(this.player.x, this.player.y - 28, ability.id === 'phase' ? 'PHASE' : 'WARD', ability.color);
    } else if (ability.kind === 'focus') {
      this.state.focus = Math.min(5, this.state.focus + 2);
      this.state.resource = Math.min(this.state.maxResource,
        this.state.resource + this.state.maxResource * [0.35, 0.55, 0.8][Math.min(rank, 2)]);
    } else {
      this.enemy.takeDamage(power);
      this.presentation.floatText(this.enemy.x, this.enemy.y - 28, '-' + power, ability.color);
      if (ability.kind === 'hybrid') this.heal(power, ability.color);
      this.secondary(ability, rank);
    }
  }

  private heal(amount: number, color: number): void {
    const healed = Math.min(amount, this.state.maxHp - this.state.hp);
    this.state.hp += healed;
    this.presentation.floatText(this.player.x, this.player.y - 28, '+' + healed, color);
  }

  private secondary(ability: AbilityDefinition, rank: number): void {
    const delays: Record<string, number[]> = {
      'ice-spike': [0.8, 1.2, 1.7], 'void-rift': [0.7, 1, 1.4], 'arcane-bind': [1, 1.7, 2.5], gale: [0.5, 0.9, 1.3],
    };
    if (delays[ability.id]) this.delayAttack(delays[ability.id][rank] ?? delays[ability.id][0]);
    if (ability.id === 'venom' || ability.id === 'soulflame') {
      this.dotTicks = 4; this.dotDamage = ([6, 10, 16][rank] ?? 6) / 4; this.dotAt = this.scene.time.now + 550;
    }
  }

  private updateDot(now: number): void {
    if (!this.dotTicks || now < this.dotAt) return;
    this.dotTicks--;
    this.dotAt = now + 550;
    this.enemy.takeDamage(this.dotDamage);
    this.presentation.floatText(this.enemy.x, this.enemy.y - 20, '-' + this.dotDamage, 0x9fe45c);
    if (this.enemy.hp <= 0) this.finish(true);
  }

  private miscast(progress: number, wrong: string): void {
    this.wrongLetter = wrong;
    this.spellState = 'miscast';
    this.nextSpellAt = this.scene.time.now + T.miscastDelay;
    if (this.state.classDef.id === 'samurai') this.state.focus = 0;
    this.hurt(Math.max(2, Math.round(this.state.maxHp * (T.miscastBase + progress * T.miscastProgress))), false);
  }

  private hurt(damage: number, critical: boolean): void {
    this.state.hp = Math.max(0, this.state.hp - damage);
    this.presentation.damage(damage, critical);
    this.signal(critical ? 'critical' : 'miscast');
    events.emit(GameEvents.playerChanged, this.state);
    this.emitChange();
    if (this.state.hp <= 0) this.finish(false);
  }

  private signal(feedback: BattleSnapshot['feedback']): void { this.feedback = feedback; this.feedbackId++; }

  private finish(victory: boolean): void {
    if (this.phase === 'ending') return;
    this.phase = 'ending';
    this.victory = victory;
    this.endAt = this.scene.time.now + T.endDelay;
    this.defenseStrike = null;
    this.enemy.cancelAttack();
    this.parser.reset();
    this.dotTicks = 0;
    this.nextAttackAt = this.nextSpellAt = Infinity;
    let levels: number[] = [];
    if (victory) {
      this.presentation.death(this.enemy);
      this.enemy.defeat();
      levels = gainXp(this.state, this.enemy.definition.xp);
      if (this.enemy.definition.unlock) this.state.unlocks[this.enemy.definition.unlock] = true;
    }
    events.emit(GameEvents.playerChanged, this.state);
    events.emit(GameEvents.battleEnded, { victory, xp: victory ? this.enemy.definition.xp : 0, levels });
  }

  private emitChange(): void { events.emit(GameEvents.battleChanged, this.snapshot()); }
  destroy(): void {
    this.active = false;
    this.parser.reset(); this.defenseStrike = null; this.dotTicks = 0;
    if (this.enemy) this.enemy.cancelAttack();
    this.presentation.destroy();
    events.emit(GameEvents.battleExited);
  }
}
