import type Phaser from 'phaser';
import type { BattleSnapshot } from '../game/combat/CombatController';
import { xpForLevel } from '../game/config/constants';
import { CLASSES } from '../game/data/classes';
import { buildWord } from '../game/systems/CombatMath';
import { GameEvents, events } from '../game/systems/EventBus';
import { gameStore } from '../game/systems/GameStore';
import { inputBridge } from '../game/systems/InputBridge';
import { canUpgrade, createPlayerState, upgradeAbility } from '../game/systems/Progression';
import type { ClassDefinition, PlayerState } from '../game/types';

const CLASS_LABELS = { mage: 'Mage', warrior: 'Warrior', samurai: 'Samurai' } as const;
const ABILITY_GLYPHS: Record<string, string> = {
  zap: 'ϟ', fireball: '◆', icespike: '◇', mend: '+',
  hit: '✦', slash: '╱', cleave: '⌁', guard: '▣',
  cut: '╱', iaido: '⌁', flurry: '≋', zen: '◉',
};
const HEART_COUNT = 8;
const RESOURCE_ORB_COUNT = 8;

const required = <T extends HTMLElement>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing UI element: ${selector}`);
  return element;
};

export class GameUI {
  private game: Phaser.Game | null = null;
  private toastTimer = 0;
  private battleActive = false;
  private previousHp: number | null = null;
  private previousXp: number | null = null;
  private previousLevel: number | null = null;
  private previousSkillPoints: number | null = null;

  constructor(private readonly startGame: (classDef: ClassDefinition) => Phaser.Game) {
    this.renderClassCards(); this.bindEvents(); this.bindControls();
    const autoClass = new URLSearchParams(window.location.search).get('auto') as keyof typeof CLASSES | null;
    if (autoClass && CLASSES[autoClass]) this.begin(CLASSES[autoClass]);
  }

  private renderClassCards(): void {
    const list = required<HTMLDivElement>('#class-list');
    list.innerHTML = Object.values(CLASSES).map((classDef) => `
      <button class="class-card ${classDef.id}" data-class="${classDef.id}">
        <span class="class-sigil" aria-hidden="true">${classDef.id === 'mage' ? '✦' : classDef.id === 'warrior' ? '◆' : '◒'}</span>
        <span class="eyebrow">${classDef.resource.name} · ${classDef.hp} HP</span>
        <strong>${CLASS_LABELS[classDef.id]}</strong>
        <span>${classDef.tagline}</span>
        <i>Begin journey →</i>
      </button>`).join('');
    list.querySelectorAll<HTMLButtonElement>('[data-class]').forEach((button) => {
      button.addEventListener('click', () => this.begin(CLASSES[button.dataset.class as keyof typeof CLASSES]));
    });
  }

  private begin(classDef: ClassDefinition): void {
    gameStore.player = createPlayerState(classDef);
    required('#title-screen').hidden = true;
    required('#game-screen').hidden = false;
    this.updateHud(gameStore.player);
    this.game = this.startGame(classDef);
  }

  private bindEvents(): void {
    events.on(GameEvents.playerChanged, (player: PlayerState) => { this.updateHud(player); this.renderUpgrades(); });
    events.on(GameEvents.battleStarted, (snapshot: BattleSnapshot) => {
      this.battleActive = true; required('#combat-panel').hidden = false; this.updateBattle(snapshot); this.refreshScale();
    });
    events.on(GameEvents.battleChanged, (snapshot: BattleSnapshot) => {
      this.updateBattle(snapshot);
      if (gameStore.player) this.updateResourceDisplay(gameStore.player);
    });
    events.on(GameEvents.battleEnded, ({ victory, xp, levels }: { victory: boolean; xp: number; levels: number[] }) => {
      this.battleActive = false;
      window.setTimeout(() => { required('#combat-panel').hidden = true; this.refreshScale(); }, 420);
      if (victory) this.showToast(`VICTORY · +${xp} XP${levels.length ? ` · LEVEL ${levels.at(-1)}` : ''}`);
      else this.showToast('DEFEAT · RETURNED TO THE WAYSTONE');
    });
    events.on(GameEvents.upgradeRequested, () => {
      if (!this.battleActive && gameStore.player) this.openUpgrades();
    });
    events.on(GameEvents.toast, (message: string) => this.showToast(message));
  }

  private bindControls(): void {
    required<HTMLButtonElement>('#release-button').addEventListener('click', () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })));
    required<HTMLButtonElement>('#abort-button').addEventListener('click', () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' })));
    const upgradeDialog = required<HTMLDialogElement>('#upgrade-dialog');
    required<HTMLButtonElement>('#close-upgrades').addEventListener('click', () => upgradeDialog.close());
    upgradeDialog.addEventListener('close', () => events.emit(GameEvents.upgradeMenuClosed));
    document.querySelectorAll<HTMLButtonElement>('[data-hold]').forEach((button) => {
      const direction = button.dataset.hold as 'left' | 'right';
      const set = (value: boolean) => { inputBridge[direction] = value; };
      button.addEventListener('pointerdown', () => set(true));
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((name) => button.addEventListener(name, () => set(false)));
    });
    document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
      button.addEventListener('pointerdown', () => {
        if (button.dataset.action === 'jump') inputBridge.jumpQueued = true;
        else inputBridge.dashQueued = true;
      });
    });
  }

  private updateHud(player: PlayerState): void {
    required('#hud-class').textContent = player.classDef.name;
    required('#hud-level').textContent = `LV ${player.level}`;
    this.updateHealthDisplay(player);
    this.updateResourceDisplay(player);

    const xpTarget = xpForLevel(player.level);
    const xpTrack = required<HTMLElement>('#xp-track');
    required('#xp-value').textContent = `${player.xp} / ${xpTarget}`;
    required<HTMLElement>('#xp-fill').style.width = `${Math.min(100, (player.xp / xpTarget) * 100)}%`;
    xpTrack.setAttribute('aria-valuemin', '0');
    xpTrack.setAttribute('aria-valuemax', String(xpTarget));
    xpTrack.setAttribute('aria-valuenow', String(player.xp));

    const skillPoints = required('#skill-points');
    skillPoints.textContent = `${player.skillPoints} SP`;
    if (this.previousSkillPoints !== null && player.skillPoints > this.previousSkillPoints) this.restartAnimation(skillPoints, 'hud-pop');
    if (this.previousLevel !== null && player.level > this.previousLevel) {
      this.restartAnimation(required('.hud-progress'), 'level-up');
    } else if (this.previousXp !== null && player.xp > this.previousXp) {
      this.restartAnimation(xpTrack, 'xp-gain');
    }

    this.previousXp = player.xp;
    this.previousLevel = player.level;
    this.previousSkillPoints = player.skillPoints;
  }

  private updateHealthDisplay(player: PlayerState): void {
    const hearts = required<HTMLElement>('#hp-hearts');
    if (hearts.children.length !== HEART_COUNT) {
      hearts.innerHTML = Array.from({ length: HEART_COUNT }, () => '<span class="hud-heart"><i></i></span>').join('');
    }

    const halfUnits = Math.round((Math.max(0, player.hp) / player.maxHp) * HEART_COUNT * 2);
    Array.from(hearts.children).forEach((heart, index) => {
      const fill = Math.max(0, Math.min(2, halfUnits - index * 2)) * 50;
      (heart as HTMLElement).style.setProperty('--fill', `${fill}%`);
    });
    hearts.setAttribute('aria-label', `Health ${Math.ceil(player.hp)} of ${player.maxHp}`);
    required('#hp-value').textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;

    if (this.previousHp !== null && player.hp !== this.previousHp) {
      hearts.classList.remove('took-damage', 'was-healed');
      this.restartAnimation(hearts, player.hp < this.previousHp ? 'took-damage' : 'was-healed');
    }
    this.previousHp = player.hp;
  }

  private updateResourceDisplay(player: PlayerState): void {
    const orbs = required<HTMLElement>('#resource-orbs');
    if (orbs.children.length !== RESOURCE_ORB_COUNT) {
      orbs.innerHTML = Array.from({ length: RESOURCE_ORB_COUNT }, () => '<span class="resource-orb"><i></i></span>').join('');
    }

    const filledOrbs = Math.round((Math.max(0, player.resource) / player.maxResource) * RESOURCE_ORB_COUNT);
    Array.from(orbs.children).forEach((orb, index) => {
      (orb as HTMLElement).style.setProperty('--fill', index < filledOrbs ? '100%' : '0%');
    });
    orbs.style.setProperty('--resource-color', player.classDef.resource.color);
    orbs.setAttribute('aria-label', `${player.classDef.resource.name} ${Math.floor(player.resource)} of ${player.maxResource}`);
    required('#resource-label').textContent = player.classDef.resource.short;
    required('#resource-value').textContent = `${Math.floor(player.resource)} / ${player.maxResource}`;
  }

  private restartAnimation(element: HTMLElement, className: string): void {
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
    window.setTimeout(() => element.classList.remove(className), 480);
  }

  private updateBattle(snapshot: BattleSnapshot): void {
    required('#enemy-name').textContent = snapshot.enemyName;
    required('#enemy-hp-value').textContent = `${Math.ceil(snapshot.enemyHp)} / ${snapshot.enemyMaxHp}`;
    required<HTMLElement>('#enemy-hp-fill').style.width = `${(snapshot.enemyHp / snapshot.enemyMaxHp) * 100}%`;
    required('#enemy-timer').textContent = `${snapshot.timer.toFixed(1)}s`;
    required<HTMLElement>('#enemy-timer-fill').style.width = `${(snapshot.timer / snapshot.timerMax) * 100}%`;
    required('#speed-value').textContent = `×${snapshot.speedMultiplier.toFixed(2)}`;
    required('#ability-list').innerHTML = snapshot.candidates.map((candidate) => {
      const active = candidate.word.full === snapshot.activeWord;
      const segments = candidate.word.segments.map((segment, index) => `<span class="${index ? 'suffix' : ''}">${segment}</span>`).join('');
      return `<div class="ability ${active ? 'active' : ''} ${candidate.affordable ? '' : 'poor'}"><div><strong>${candidate.ability.name}</strong><span class="spell-word">${segments}</span></div><em>${candidate.ability.cost || 'free'}${candidate.ability.cost ? gameStore.player!.classDef.resource.short : ''}</em></div>`;
    }).join('');
    const word = required('#current-word');
    if (!snapshot.activeWord) word.innerHTML = '<span>Type a spell word</span>';
    else word.innerHTML = `<b>${snapshot.activeWord.slice(0, snapshot.typed)}</b><u>${snapshot.activeWord[snapshot.typed] ?? ''}</u><i>${snapshot.activeWord.slice(snapshot.typed + 1)}</i>`;
    required('#battle-log').innerHTML = snapshot.logs.map((log) => `<p class="${log.tone}">${log.text}</p>`).join('');
  }

  private openUpgrades(): void {
    this.renderUpgrades();
    const dialog = required<HTMLDialogElement>('#upgrade-dialog');
    if (!dialog.open) dialog.showModal();
  }

  private renderUpgrades(): void {
    const player = gameStore.player;
    if (!player) return;

    required('#upgrade-skill-points').textContent = `${player.skillPoints} SP`;
    required('#upgrade-list').innerHTML = player.classDef.abilities.map((ability) => {
      const level = player.abilityLevels[ability.id];
      const maxRank = ability.suffixes.length + 1;
      const word = buildWord(ability, level);
      const next = ability.suffixes[level - 1];
      const mastered = !next;
      const rankPips = Array.from({ length: maxRank }, (_, index) =>
        `<i class="${index < level ? 'filled' : ''}" aria-hidden="true"></i>`
      ).join('');
      const spellColor = `#${ability.color.toString(16).padStart(6, '0')}`;
      const glyph = ABILITY_GLYPHS[ability.id] ?? '✦';

      return `
        <article class="upgrade-card ${mastered ? 'mastered' : ''}" data-ability-card="${ability.id}">
          <div class="upgrade-card-top">
            <span class="spell-icon" style="--spell-color:${spellColor}" aria-hidden="true"><i>${glyph}</i></span>
            <div class="upgrade-card-main">
              <div class="upgrade-card-title">
                <strong>${ability.name}</strong>
                <span class="rank-pips">${rankPips}</span>
              </div>
              <span class="upgrade-rank">Rank ${level} / ${maxRank}</span>
              <code>${word.segments.join('<b>·</b>')}${next ? `<i>·${next}</i>` : ''}</code>
              <p>${ability.description}</p>
            </div>
          </div>
          <button data-upgrade="${ability.id}" ${canUpgrade(player, ability) ? '' : 'disabled'}>
            ${next ? `Add “${next}” · 1 SP` : 'Mastered'}
          </button>
        </article>`;
    }).join('');

    document.querySelectorAll<HTMLButtonElement>('[data-upgrade]').forEach((button) => button.addEventListener('click', () => {
      const ability = player.classDef.abilities.find((item) => item.id === button.dataset.upgrade);
      if (ability && upgradeAbility(player, ability)) {
        this.updateHud(player);
        this.renderUpgrades();
        events.emit(GameEvents.playerChanged, player);
        events.emit(GameEvents.upgradePurchased);
      }
    }));
  }

  private showToast(message: string): void {
    const toast = required('#toast');
    toast.textContent = message; toast.classList.add('visible');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 2600);
  }

  private refreshScale(): void { window.setTimeout(() => this.game?.scale.refresh(), 40); }
}
