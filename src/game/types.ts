export type ClassId = 'mage' | 'warrior' | 'samurai';
export type AbilityKind = 'ranged' | 'melee' | 'heal' | 'guard' | 'focus' | 'utility' | 'hybrid';
export type BiomeId = 'forest' | 'cave' | 'crystal' | 'deadwood' | 'sakura' | 'arena';

export interface AbilityDefinition {
  id: string;
  name: string;
  trigger: string;
  suffixes: string[];
  /** Explicit spell forms by rank. When present, these replace trigger+suffix word building. */
  words?: string[];
  cost: number;
  basePower: number;
  /** Exact base power by rank before typing-speed and player-level multipliers. */
  rankPowers?: number[];
  kind: AbilityKind;
  color: number;
  description: string;
  rankDescriptions?: string[];
  assetPath?: string;
  starter?: boolean;
  unlockCost?: number;
  upgradeCosts?: number[];
}

export interface ClassDefinition {
  id: ClassId;
  name: string;
  tagline: string;
  hp: number;
  resource: { name: string; short: string; max: number; regen: number; color: string };
  abilities: AbilityDefinition[];
  /** Up to six abilities that begin equipped in combat. */
  starterDeck?: string[];
}

export interface PlayerState {
  classDef: ClassDefinition;
  level: number;
  xp: number;
  skillPoints: number;
  hp: number;
  maxHp: number;
  resource: number;
  maxResource: number;
  focus: number;
  abilityLevels: Record<string, number>;
  learnedAbilityIds: string[];
  deckAbilityIds: string[];
  unlocks: { doubleJump: boolean; longDash: boolean };
}

export interface EnemyDefinition {
  id: string;
  name: string;
  hp: number;
  attack: number;
  interval: number;
  xp: number;
  color: number;
  accent: number;
  boss?: boolean;
  unlock?: keyof PlayerState['unlocks'];
}

export interface WordDefinition {
  segments: string[];
  full: string;
  boundaries: number[];
}

export interface SpellCandidate {
  ability: AbilityDefinition;
  word: WordDefinition;
  affordable: boolean;
}

export interface BiomePalette {
  skyTop: number;
  skyBottom: number;
  haze: number;
  far: number;
  middle: number;
  near: number;
  ground: number;
  groundDark: number;
  grass: number;
  accent: number;
}

export interface BiomeLayerConfig {
  id: string;
  kind: 'authored' | 'gradient' | 'canopy' | 'trees' | 'undergrowth' | 'fog' | 'shafts' | 'foreground';
  depth: number;
  parallax: number;
  repeat: boolean;
  assetKey?: string;
  scaleMultiplier?: number;
  horizontalOverlap?: number;
  groundAnchor?: number;
  drift?: { x: number; y: number };
  blendMode?: 'NORMAL' | 'ADD' | 'SCREEN';
  opacity?: number;
}

export interface BiomeDefinition {
  id: BiomeId;
  name: string;
  status: 'complete' | 'scaffold';
  palette: BiomePalette;
  layers: BiomeLayerConfig[];
  particles: { color: number[]; count: number; speedX: [number, number]; speedY: [number, number]; blendMode: 'NORMAL' | 'ADD' };
}
