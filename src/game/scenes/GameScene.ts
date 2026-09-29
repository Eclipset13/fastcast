import Phaser from 'phaser';
import { CombatController } from '../combat/CombatController';
import { COMBAT_TUNING, GAME_HEIGHT, GROUND_Y, WORLD_WIDTH } from '../config/constants';
import { BIOMES } from '../data/biomes';
import { FOREST_WRAITH } from '../data/enemies';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { MAGE_JUMP_SPRITE, MAGE_RUN_SPRITE, MAGE_SPRITE } from '../entities/mageSprite';
import { createEnemyTexture, createFxTextures, createHeroTextures } from '../entities/createTextures';
import { GameEvents, events } from '../systems/EventBus';
import { gameStore } from '../systems/GameStore';
import { BiomeRenderer } from '../world/BiomeRenderer';
import {
  createEmeraldForestPropDecorations,
  createEmeraldForestTreeDecorations,
  EMERALD_FOREST_PROP_ASSETS,
  EMERALD_FOREST_TREE_ASSETS,
} from '../world/EmeraldForestDecorations';
import { RunestoneInteraction } from '../world/RunestoneInteraction';
import { ForestPortal, FOREST_PORTAL_ASSETS, FOREST_PORTAL_POSITION } from '../world/ForestPortal';

type PlatformTexture =
  | 'forest-platform-long'
  | 'forest-platform-medium-a'
  | 'forest-platform-medium-b'
  | 'forest-platform-small-a'
  | 'forest-platform-small-b';

interface ForestPlatform {
  x: number;
  y: number;
  texture: PlatformTexture;
}

const PLATFORM_SCALE: Record<PlatformTexture, number> = {
  'forest-platform-long': 0.068,
  'forest-platform-medium-a': 0.064,
  'forest-platform-medium-b': 0.064,
  'forest-platform-small-a': 0.055,
  'forest-platform-small-b': 0.055,
};

const GROUND_TEXTURE = 'forest-ground-main';
const GROUND_TILE_WIDTH = 360;
const GROUND_SURFACE_Y = 384;
const PLATFORM_ART: Record<PlatformTexture, { surfaceX: number; surfaceY: number; surfaceWidth: number }> = {
  'forest-platform-long': { surfaceX: 83, surfaceY: 334, surfaceWidth: 1989 },
  'forest-platform-medium-a': { surfaceX: 84, surfaceY: 405, surfaceWidth: 1603 },
  'forest-platform-medium-b': { surfaceX: 141, surfaceY: 398, surfaceWidth: 1529 },
  'forest-platform-small-a': { surfaceX: 126, surfaceY: 492, surfaceWidth: 1270 },
  'forest-platform-small-b': { surfaceX: 109, surfaceY: 499, surfaceWidth: 1319 },
};

const FOREST_PLATFORMS: ForestPlatform[] = [
  // First ascent: a forgiving introduction from ground to the upper canopy route.
  { x: 320, y: 182, texture: 'forest-platform-medium-a' },
  { x: 425, y: 139, texture: 'forest-platform-small-a' },
  { x: 545, y: 112, texture: 'forest-platform-long' },
  { x: 700, y: 162, texture: 'forest-platform-medium-b' },

  // Central climb: staggered landings with a broad upper resting platform.
  { x: 850, y: 188, texture: 'forest-platform-small-b' },
  { x: 950, y: 144, texture: 'forest-platform-medium-a' },
  { x: 1070, y: 103, texture: 'forest-platform-long' },
  { x: 1225, y: 151, texture: 'forest-platform-small-a' },
  { x: 1350, y: 184, texture: 'forest-platform-long' },

  // Final ascent reaches the room's highest third-floor ledges.
  { x: 1515, y: 176, texture: 'forest-platform-medium-b' },
  { x: 1620, y: 130, texture: 'forest-platform-small-b' },
  { x: 1740, y: 96, texture: 'forest-platform-long' },
  { x: 1900, y: 149, texture: 'forest-platform-medium-a' },
  { x: 2030, y: 111, texture: 'forest-platform-small-a' },
  { x: 2160, y: 170, texture: 'forest-platform-long' },
  { x: 2320, y: 132, texture: 'forest-platform-medium-b' },
  { x: 2440, y: 94, texture: 'forest-platform-small-b' },
];

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private combat!: CombatController;
  private biomeRenderer!: BiomeRenderer;
  private terrain!: Phaser.Physics.Arcade.StaticGroup;
  private runestone!: Phaser.GameObjects.Image;
  private runestoneInteraction!: RunestoneInteraction;
  private exitPortal!: ForestPortal;

  constructor() { super('gameplay'); }

  preload(): void {
    if (gameStore.player?.classDef.id === 'mage') {
      this.load.image(MAGE_RUN_SPRITE.key, MAGE_RUN_SPRITE.path);
      this.load.image(MAGE_JUMP_SPRITE.key, MAGE_JUMP_SPRITE.path);
      this.load.spritesheet(MAGE_SPRITE.key, MAGE_SPRITE.path, {
        frameWidth: MAGE_SPRITE.frameWidth,
        frameHeight: MAGE_SPRITE.frameHeight,
      });
    }
    this.load.image('forest-bg-far', '/assets/biomes/emerald-forest/bg-far.png');
    this.load.image('forest-bg-mid', '/assets/biomes/emerald-forest/bg-mid.png');
    this.load.image('forest-bg-near', '/assets/biomes/emerald-forest/bg-near.png');
    this.load.image('forest-platform-long', '/assets/biomes/emerald-forest/platforms/platform-long.png');
    this.load.image('forest-platform-medium-a', '/assets/biomes/emerald-forest/platforms/platform-medium-a.png');
    this.load.image('forest-platform-medium-b', '/assets/biomes/emerald-forest/platforms/platform-medium-b.png');
    this.load.image('forest-platform-small-a', '/assets/biomes/emerald-forest/platforms/platform-small-a.png');
    this.load.image('forest-platform-small-b', '/assets/biomes/emerald-forest/platforms/platform-small-b.png');
    this.load.image(GROUND_TEXTURE, '/assets/biomes/emerald-forest/ground/ground-main.png');
    for (const tree of EMERALD_FOREST_TREE_ASSETS) this.load.image(tree.key, tree.path);
    for (const prop of EMERALD_FOREST_PROP_ASSETS) this.load.image(prop.key, prop.path);
    this.load.image(FOREST_PORTAL_ASSETS.frame.key, FOREST_PORTAL_ASSETS.frame.path);
    this.load.spritesheet(FOREST_PORTAL_ASSETS.activeSheet.key, FOREST_PORTAL_ASSETS.activeSheet.path, {
      frameWidth: FOREST_PORTAL_ASSETS.activeSheet.frameWidth,
      frameHeight: FOREST_PORTAL_ASSETS.activeSheet.frameHeight,
    });
  }

  create(): void {
    const state = gameStore.player;
    if (!state) throw new Error('A class must be selected before the gameplay scene starts.');

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT).setRoundPixels(true).setBackgroundColor('#071c18');

    this.biomeRenderer = new BiomeRenderer(this, BIOMES.forest);
    this.biomeRenderer.create();
    createEmeraldForestTreeDecorations(this);
    createHeroTextures(this, state.classDef.id); createEnemyTexture(this, FOREST_WRAITH); createFxTextures(this);
    this.terrain = this.physics.add.staticGroup();
    this.createTerrain();

    const query = new URLSearchParams(window.location.search);
    const startX = query.has('battle') ? 625 : Number(query.get('x')) || 110;
    this.player = new Player(this, startX, GROUND_Y - 18, state);
    this.physics.add.collider(this.player, this.terrain);
    this.cameras.main.startFollow(this.player, true, 0.075, 0.075, -80, 12);
    this.cameras.main.fadeIn(700, 5, 20, 14);

    this.spawnEnemy(760, GROUND_Y - 18);
    this.spawnEnemy(1350, 184 - 18);
    this.combat = new CombatController(this, this.player, state, (victory) => this.finishBattle(victory));
    this.runestoneInteraction = new RunestoneInteraction(
      this,
      this.player,
      this.runestone,
      () => !this.combat.active,
    );
    this.exitPortal = new ForestPortal(
      this,
      this.player,
      FOREST_PORTAL_POSITION.x,
      FOREST_PORTAL_POSITION.y,
      () => !this.combat.active && !document.querySelector<HTMLDialogElement>('#upgrade-dialog')?.open,
      () => events.emit(GameEvents.toast, 'The path beyond is not yet formed.'),
    );
    const handleKey = (event: KeyboardEvent) => {
      if (this.combat.handleKey(event)) event.preventDefault();
    };
    // Combat consumes each native keydown once, immediately. Phaser's queued movement
    // keys remain independent and are reset before exploration control returns.
    window.addEventListener('keydown', handleKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', handleKey);
      this.combat.destroy();
    });
    events.emit(GameEvents.playerChanged, state);
    events.emit(GameEvents.toast, 'The canopy breathes. Something watches ahead.');
  }

  update(_time: number, delta: number): void {
    const seconds = Math.min(delta / 1000, 0.05);
    this.biomeRenderer.update(seconds);
    this.player.update(this.time.now);
    if (!this.combat.active) {
      for (const enemy of this.enemies) enemy.update();
      this.checkEncounters();
    }
    this.combat.update(seconds);
    this.runestoneInteraction.update();
    this.exitPortal.update(seconds);
    if (this.player.y > GAME_HEIGHT + 20) this.respawn();
  }

  private spawnEnemy(x: number, y: number): void {
    const enemy = new Enemy(this, x, y, FOREST_WRAITH);
    this.enemies.push(enemy);
    this.physics.add.collider(enemy, this.terrain);
  }

  private checkEncounters(): void {
    if (document.querySelector<HTMLDialogElement>('#upgrade-dialog')?.open) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (!body.blocked.down && !body.touching.down) return;
    for (const enemy of this.enemies) {
      if (enemy.defeated) continue;
      const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;
      if (!enemyBody.blocked.down && !enemyBody.touching.down) continue;
      const distance = Math.abs(enemy.x - this.player.x);
      if (distance > COMBAT_TUNING.encounterDistance || Math.abs(body.bottom - enemyBody.bottom) > COMBAT_TUNING.encounterHeight) continue;
      // A landing directly beside an enemy must not start an overlapping duel.
      // Find a supported horizontal position on the same surface; never change Y.
      if (distance < COMBAT_TUNING.minimumSpacing) {
        const side = this.player.x <= enemy.x ? -1 : 1;
        const x = enemy.x + side * COMBAT_TUNING.minimumSpacing;
        const supported = this.terrain.getChildren().some((object) => {
          const surface = object.body as Phaser.Physics.Arcade.StaticBody;
          return x - 6 >= surface.left && x + 6 <= surface.right && Math.abs(surface.top - body.bottom) < 5;
        });
        if (!supported || x < 12 || x > WORLD_WIDTH - 12) continue;
        this.player.setX(x);
        body.updateFromGameObject();
      }
      this.combat.start(enemy);
      if (this.combat.active) {
        for (const other of this.enemies) if (other !== enemy) other.setVelocityX(0);
        break;
      }
    }
  }

  private finishBattle(victory: boolean): void {
    if (!victory) {
      const state = gameStore.player!;
      state.hp = state.maxHp; state.resource = state.maxResource;
      this.player.setPosition(110, GROUND_Y - 18);
      events.emit(GameEvents.playerChanged, state);
      events.emit(GameEvents.toast, 'The forest returns you to the waystone.');
    } else {
      events.emit(GameEvents.toast, 'Wraith dispersed · experience gained');
      if (this.enemies.every((enemy) => enemy.defeated)) this.exitPortal.activate();
    }
  }

  private respawn(): void {
    this.player.setPosition(110, GROUND_Y - 18).setVelocity(0, 0);
  }

  private createTerrain(): void {
    const groundBody = this.terrain.create(WORLD_WIDTH / 2, GROUND_Y + (GAME_HEIGHT - GROUND_Y) / 2, 'pixel-white') as Phaser.Physics.Arcade.Sprite;
    groundBody.setVisible(false).setDisplaySize(WORLD_WIDTH, GAME_HEIGHT - GROUND_Y).refreshBody();
    this.createGroundVisual();
    this.runestone = createEmeraldForestPropDecorations(this)['runestone-start'];
    for (const platform of FOREST_PLATFORMS) {
      const art = PLATFORM_ART[platform.texture];
      const scale = PLATFORM_SCALE[platform.texture];
      const body = this.terrain.create(platform.x, platform.y + 3, 'pixel-white') as Phaser.Physics.Arcade.Sprite;
      body.setVisible(false).setDisplaySize(art.surfaceWidth * scale, 6).refreshBody();
      this.createPlatformVisual(platform);
    }
    this.paintLandmarks();
  }

  private createGroundVisual(): void {
    const source = this.textures.get(GROUND_TEXTURE).getSourceImage();
    const scale = GROUND_TILE_WIDTH / source.width;
    const tileWidth = source.width * scale;
    const tileY = GROUND_Y - GROUND_SURFACE_Y * scale;
    const tileCount = Math.ceil(WORLD_WIDTH / tileWidth);

    for (let index = 0; index < tileCount; index += 1) {
      this.add.image(index * tileWidth, tileY, GROUND_TEXTURE)
        .setOrigin(0)
        .setScale(scale)
        .setDepth(5);
    }
  }

  private createPlatformVisual(platform: ForestPlatform): void {
    const art = PLATFORM_ART[platform.texture];
    const scale = PLATFORM_SCALE[platform.texture];
    this.add.image(
      platform.x - (art.surfaceX + art.surfaceWidth / 2) * scale,
      platform.y - art.surfaceY * scale,
      platform.texture,
    ).setOrigin(0).setScale(scale).setDepth(5);
  }

  private paintLandmarks(): void {
    const graphics = this.add.graphics().setDepth(4);
    // Small stones break up the long gameplay plane between authored props.
    for (const x of [245, 815, 1260, 1660, 1970, 2440]) {
      graphics.fillStyle(0x263e32, 1).fillTriangle(x, GROUND_Y, x + 7, GROUND_Y - 8, x + 15, GROUND_Y);
      graphics.fillStyle(0x496b51, 1).fillTriangle(x + 5, GROUND_Y - 2, x + 8, GROUND_Y - 7, x + 10, GROUND_Y - 2);
    }
  }
}
