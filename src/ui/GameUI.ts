import type Phaser from 'phaser';
import { BattleUI } from './BattleUI';
import type { BattleSnapshot } from '../game/combat/CombatController';
import { xpForLevel } from '../game/config/constants';
import { CLASSES } from '../game/data/classes';
import { buildWord } from '../game/systems/CombatMath';
import { GameEvents, events } from '../game/systems/EventBus';
import { gameStore } from '../game/systems/GameStore';
import { inputBridge } from '../game/systems/InputBridge';
import {
  abilityUpgradeCost,
  canLearn,
  canUpgrade,
  createPlayerState,
  equipAbility,
  isAbilityLearned,
  learnAbility,
  selectAbilityRank,
  selectedAbilityRank,
  unequipAbility,
  upgradeAbility,
} from '../game/systems/Progression';
import type { AbilityDefinition, ClassDefinition, PlayerState } from '../game/types';

const CLASS_LABELS = { mage: 'Mage', warrior: 'Warrior', samurai: 'Samurai' } as const;
const ABILITY_GLYPHS: Record<string, string> = {
  hit: '✦', slash: '╱', cleave: '⌁', guard: '▣',
  cut: '╱', iaido: '⌁', flurry: '≋', zen: '◉',
};
const HEART_COUNT = 8;
const RESOURCE_ORB_COUNT = 8;

type SpellcraftTab = 'deck' | 'learn' | 'upgrade';

const required = <T extends HTMLElement>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing UI element: ${selector}`);
  return element;
};

const maxRank = (ability: AbilityDefinition) => ability.words?.length ?? ability.suffixes.length + 1;

export class GameUI {
  private readonly battleUI = new BattleUI();
  private toastTimer = 0;
  private battleActive = false;
  private previousHp: number | null = null;
  private previousXp: number | null = null;
  private previousLevel: number | null = null;
  private previousSkillPoints: number | null = null;
  private spellcraftTab: SpellcraftTab = 'deck';
  private spellcraftRenderKey = '';
  private readonly preloadedIcons = new Map<string, HTMLImageElement>();

  constructor(private readonly startGame: (classDef: ClassDefinition) => Phaser.Game) {
    this.renderClassCards();
    this.bindEvents();
    this.bindControls();
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
    this.startGame(classDef);
    // Warm only the small set of assets that the default Deck tab needs.
    // The full 20-spell archive stays lazy so opening Spellcraft never decodes
    // every large source PNG at once.
    window.setTimeout(() => this.preloadSpellcraftAssets(gameStore.player!), 0);
  }

  private bindEvents(): void {
    events.on(GameEvents.playerChanged, (player: PlayerState) => {
      this.updateHud(player);
      if (required<HTMLDialogElement>('#upgrade-dialog').open) this.renderUpgrades();
    });
    events.on(GameEvents.battleStarted, (snapshot: BattleSnapshot) => {
      this.battleActive = true;
      this.battleUI.start(snapshot);
    });
    events.on(GameEvents.battleChanged, (snapshot: BattleSnapshot) => {
      this.battleUI.update(snapshot);
      if (gameStore.player) this.updateResourceDisplay(gameStore.player);
    });
    events.on(GameEvents.battleEnded, ({ victory, xp, levels }: { victory: boolean; xp: number; levels: number[] }) => {
      this.battleUI.end();
      if (victory) this.showToast(`VICTORY · +${xp} XP${levels.length ? ` · LEVEL ${levels.at(-1)}` : ''}`);
      else this.showToast('DEFEAT · RETURNED TO THE WAYSTONE');
    });
    events.on(GameEvents.battleExited, () => {
      this.battleActive = false;
      this.battleUI.clear();
    });
    events.on(GameEvents.upgradeRequested, () => {
      if (!this.battleActive && gameStore.player) this.openUpgrades();
    });
    events.on(GameEvents.toast, (message: string) => this.showToast(message));
  }

  private bindControls(): void {
    const upgradeDialog = required<HTMLDialogElement>('#upgrade-dialog');
    required<HTMLButtonElement>('#close-upgrades').addEventListener('click', () => upgradeDialog.close());
    upgradeDialog.addEventListener('close', () => events.emit(GameEvents.upgradeMenuClosed));

    document.querySelectorAll<HTMLButtonElement>('[data-spellcraft-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        this.spellcraftTab = button.dataset.spellcraftTab as SpellcraftTab;
        this.renderUpgrades();
      });
    });

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
    if (this.previousSkillPoints !== null && player.skillPoints > this.previousSkillPoints) {
      this.restartAnimation(skillPoints, 'hud-pop');
    }
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

  private openUpgrades(): void {
    this.spellcraftTab = 'deck';
    this.renderUpgrades();
    const dialog = required<HTMLDialogElement>('#upgrade-dialog');
    if (!dialog.open) dialog.showModal();
  }

  private abilityIcon(ability: AbilityDefinition): string {
    if (ability.assetPath) {
      return `<span class="spellcraft-icon"><img src="${ability.assetPath}" alt="" draggable="false" loading="lazy" decoding="async" fetchpriority="low" width="52" height="52"><i aria-hidden="true"></i></span>`;
    }
    return `<span class="spellcraft-icon spellcraft-icon-fallback" aria-hidden="true">${ABILITY_GLYPHS[ability.id] ?? '✦'}<i></i></span>`;
  }

  private rankPips(ability: AbilityDefinition, level: number): string {
    return Array.from({ length: maxRank(ability) }, (_, index) =>
      `<i class="${index < level ? 'filled' : ''}" aria-hidden="true"></i>`
    ).join('');
  }

  private renderUpgrades(): void {
    const player = gameStore.player;
    if (!player) return;

    required('#upgrade-skill-points').textContent = `${player.skillPoints} SP`;
    document.querySelectorAll<HTMLButtonElement>('[data-spellcraft-tab]').forEach((button) => {
      const active = button.dataset.spellcraftTab === this.spellcraftTab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });

    // player:changed is also used by HP/XP/resource updates. Rebuilding the entire
    // Spellcraft DOM (and re-decoding large spell PNGs) for those unrelated events
    // was the main source of menu hitching. Only rebuild when Spellcraft state changed.
    const renderKey = this.getSpellcraftRenderKey(player);
    if (renderKey === this.spellcraftRenderKey) return;

    const list = required<HTMLDivElement>('#upgrade-list');
    if (this.spellcraftTab === 'deck') list.innerHTML = this.renderDeck(player);
    else if (this.spellcraftTab === 'learn') list.innerHTML = this.renderLearn(player);
    else list.innerHTML = this.renderUpgradeList(player);

    this.spellcraftRenderKey = renderKey;
    this.bindSpellcraftActions(player);
  }

  private getSpellcraftRenderKey(player: PlayerState): string {
    const levels = player.classDef.abilities.map((ability) => `${ability.id}:${player.abilityLevels[ability.id] ?? 1}`).join(',');
    const selectedRanks = player.classDef.abilities.map((ability) =>
      `${ability.id}:${selectedAbilityRank(player, ability)}`).join(',');
    return [
      this.spellcraftTab,
      player.skillPoints,
      player.learnedAbilityIds.join(','),
      player.deckAbilityIds.join(','),
      levels,
      selectedRanks,
    ].join('|');
  }

  private preloadSpellcraftAssets(player: PlayerState): void {
    const urls = [
      '/assets/ui/spellcraft/spellcraft-frame.png',
      '/assets/ui/spellcraft/spell-border.png',
      ...player.deckAbilityIds
        .map((id) => player.classDef.abilities.find((ability) => ability.id === id)?.assetPath)
        .filter((path): path is string => Boolean(path)),
    ];

    for (const url of new Set(urls)) {
      if (this.preloadedIcons.has(url)) continue;
      const image = new Image();
      image.decoding = 'async';
      image.src = url;
      this.preloadedIcons.set(url, image);
      void image.decode().catch(() => undefined);
    }
  }

  private renderDeck(player: PlayerState): string {
    const slots = Array.from({ length: 6 }, (_, slot) => {
      const id = player.deckAbilityIds[slot];
      const ability = id ? player.classDef.abilities.find((item) => item.id === id) : undefined;
      if (!ability) {
        return `<article class="deck-slot empty">
          <span class="deck-slot-number">0${slot + 1}</span>
          <div><strong>Empty slot</strong><p>Equip a learned spell below.</p></div>
        </article>`;
      }
      const level = player.abilityLevels[ability.id] ?? 1;
      const activeRank = selectedAbilityRank(player, ability);
      const word = buildWord(ability, activeRank).full;
      const rankPicker = level > 1 ? `
        <div class="deck-rank-picker" aria-label="Choose ${ability.name} version">
          ${Array.from({ length: level }, (_, index) => {
            const rank = index + 1;
            const rankWord = buildWord(ability, rank).full;
            return `<button type="button" class="${rank === activeRank ? 'active' : ''}"
              data-rank-ability="${ability.id}" data-rank-value="${rank}"
              title="Rank ${rank}: ${rankWord}" aria-pressed="${rank === activeRank}">R${rank}</button>`;
          }).join('')}
        </div>` : '';
      return `<article class="deck-slot">
        <span class="deck-slot-number">0${slot + 1}</span>
        ${this.abilityIcon(ability)}
        <div class="deck-slot-copy">
          <strong>${ability.name}</strong>
          <code>${word}</code>
          <span>Using rank ${activeRank} · unlocked ${level} / ${maxRank(ability)}</span>
          ${rankPicker}
        </div>
        <button class="quiet-button" data-unequip="${ability.id}">Remove</button>
      </article>`;
    }).join('');

    const reserve = player.classDef.abilities
      .filter((ability) => isAbilityLearned(player, ability) && !player.deckAbilityIds.includes(ability.id))
      .map((ability) => {
        const full = player.deckAbilityIds.length >= 6;
        return `<article class="reserve-spell">
          ${this.abilityIcon(ability)}
          <div><strong>${ability.name}</strong><code>${buildWord(ability, selectedAbilityRank(player, ability)).full}</code></div>
          <button data-equip="${ability.id}" ${full ? 'disabled' : ''}>${full ? 'Free a slot' : 'Equip'}</button>
        </article>`;
      }).join('');

    return `
      <section class="spellcraft-section deck-section">
        <div class="spellcraft-section-heading">
          <div><span class="eyebrow">Active loadout</span><h3>Your deck</h3></div>
          <p>Only these six spells appear during combat. Remove one before equipping a replacement.</p>
        </div>
        <div class="deck-grid">${slots}</div>
        <div class="reserve-heading"><span>Learned spells</span><b>${player.learnedAbilityIds.length} known</b></div>
        <div class="reserve-grid">${reserve || '<p class="spellcraft-empty">Every learned spell is already in the deck.</p>'}</div>
      </section>`;
  }

  private renderLearn(player: PlayerState): string {
    if (player.classDef.id !== 'mage') {
      return '<div class="spellcraft-empty-state"><strong>More techniques are coming.</strong><p>This workshop is currently complete for the Runesinger.</p></div>';
    }

    const cards = player.classDef.abilities.map((ability) => {
      const learned = isAbilityLearned(player, ability);
      const unlockCost = ability.unlockCost ?? 0;
      const level = player.abilityLevels[ability.id] ?? 1;
      const word = buildWord(ability, level).full;
      const effect = ability.rankDescriptions?.[0] ?? ability.description;
      return `<article class="catalog-spell ${learned ? 'learned' : ''}">
        ${this.abilityIcon(ability)}
        <div class="catalog-copy">
          <div class="catalog-title"><strong>${ability.name}</strong><span>${ability.cost || '0'} MP</span></div>
          <code>${word}</code>
          <p>${effect}</p>
        </div>
        <button data-learn="${ability.id}" ${learned || !canLearn(player, ability) ? 'disabled' : ''}>
          ${learned ? 'Learned' : `Learn · ${unlockCost} SP`}
        </button>
      </article>`;
    }).join('');

    return `
      <section class="spellcraft-section">
        <div class="spellcraft-section-heading">
          <div><span class="eyebrow">Spell archive</span><h3>Learn spells</h3></div>
          <p>Stronger and more specialized magic costs more SP to unlock. Learning does not automatically equip it.</p>
        </div>
        <div class="catalog-grid">${cards}</div>
      </section>`;
  }

  private renderUpgradeList(player: PlayerState): string {
    const cards = player.classDef.abilities.filter((ability) => isAbilityLearned(player, ability)).map((ability) => {
      const level = player.abilityLevels[ability.id] ?? 1;
      const rankCount = maxRank(ability);
      const cost = abilityUpgradeCost(player, ability);
      const nextLevel = Math.min(rankCount, level + 1);
      const currentWord = buildWord(ability, level).full;
      const nextWord = level < rankCount ? buildWord(ability, nextLevel).full : currentWord;
      const description = ability.rankDescriptions?.[level - 1] ?? ability.description;
      const nextDescription = ability.rankDescriptions?.[nextLevel - 1] ?? description;

      return `<article class="upgrade-spell-card ${cost === null ? 'mastered' : ''}">
        ${this.abilityIcon(ability)}
        <div class="upgrade-spell-main">
          <div class="catalog-title"><strong>${ability.name}</strong><span class="rank-pips">${this.rankPips(ability, level)}</span></div>
          <span class="upgrade-rank">Rank ${level} / ${rankCount}</span>
          <div class="word-upgrade">
            <code>${currentWord}</code>
            ${cost === null ? '' : `<i>→</i><code>${nextWord}</code>`}
          </div>
          <p>${description}</p>
          ${cost === null ? '' : `<small>Next: ${nextDescription}</small>`}
        </div>
        <button data-upgrade="${ability.id}" ${canUpgrade(player, ability) ? '' : 'disabled'}>
          ${cost === null ? 'Mastered' : `Upgrade · ${cost} SP`}
        </button>
      </article>`;
    }).join('');

    return `
      <section class="spellcraft-section">
        <div class="spellcraft-section-heading">
          <div><span class="eyebrow">Word extension</span><h3>Upgrade spells</h3></div>
          <p>Every upgrade makes the spell stronger and its casting word longer.</p>
        </div>
        <div class="upgrade-catalog">${cards}</div>
      </section>`;
  }

  private bindSpellcraftActions(player: PlayerState): void {
    document.querySelectorAll<HTMLButtonElement>('[data-learn]').forEach((button) => {
      button.addEventListener('click', () => {
        const ability = player.classDef.abilities.find((item) => item.id === button.dataset.learn);
        if (ability && learnAbility(player, ability)) {
          events.emit(GameEvents.playerChanged, player);
          events.emit(GameEvents.upgradePurchased);
          this.showToast(`${ability.name} learned · add it to your deck`);
        }
      });
    });

    document.querySelectorAll<HTMLButtonElement>('[data-equip]').forEach((button) => {
      button.addEventListener('click', () => {
        const ability = player.classDef.abilities.find((item) => item.id === button.dataset.equip);
        if (ability && equipAbility(player, ability)) {
          events.emit(GameEvents.playerChanged, player);
          this.showToast(`${ability.name} equipped`);
        }
      });
    });

    document.querySelectorAll<HTMLButtonElement>('[data-rank-ability]').forEach((button) => {
      button.addEventListener('click', () => {
        const ability = player.classDef.abilities.find((item) => item.id === button.dataset.rankAbility);
        const rank = Number(button.dataset.rankValue);
        if (ability && selectAbilityRank(player, ability, rank)) {
          events.emit(GameEvents.playerChanged, player);
          this.showToast(`${ability.name} · Rank ${rank} selected`);
        }
      });
    });

    document.querySelectorAll<HTMLButtonElement>('[data-unequip]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.unequip;
        if (id && unequipAbility(player, id)) {
          events.emit(GameEvents.playerChanged, player);
          this.showToast('Deck slot opened');
        }
      });
    });

    document.querySelectorAll<HTMLButtonElement>('[data-upgrade]').forEach((button) => {
      button.addEventListener('click', () => {
        const ability = player.classDef.abilities.find((item) => item.id === button.dataset.upgrade);
        if (ability && upgradeAbility(player, ability)) {
          events.emit(GameEvents.playerChanged, player);
          events.emit(GameEvents.upgradePurchased);
          this.showToast(`${ability.name} upgraded · casting word extended`);
        }
      });
    });
  }

  private showToast(message: string): void {
    const toast = required('#toast');
    toast.textContent = message;
    toast.classList.add('visible');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 2600);
  }

}
