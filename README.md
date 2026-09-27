# Fastcast

Fastcast is a pixel-art typing-combat metroidvania prototype. This repository now uses **Vite + TypeScript + Phaser 3** for the game world and keeps interface-heavy screens in semantic HTML/CSS.

The current vertical slice covers the Emerald Forest: choose one of three classes, explore a scrolling platforming space, dash and jump through layered scenery, and touch a Briar Wraith to enter real-time typing combat.

## Run it

```bash
npm install
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`). Other useful commands:

```bash
npm run typecheck
npm run build
npm run preview
```

For visual testing, `?auto=mage` skips the title screen. Add `&battle=1` to begin beside the first enemy.

## Project structure

```text
src/
  main.ts                       Phaser/UI bootstrap
  game/
    combat/CombatController.ts  live battle state and spell resolution
    config/                     Phaser and tuning configuration
    data/                       classes, enemies, and biome definitions
    entities/                   Phaser player/enemy objects and pixel textures
    scenes/GameScene.ts         gameplay composition and encounter flow
    systems/                    parser, combat math, progression, events, input
    world/                      biome renderer and procedural layer painters
  ui/GameUI.ts                  DOM HUD, combat panel, and upgrade overlay
  style.css                     responsive overlay presentation
assets/bg/                      old painted references (title treatment only)
legacy/                         pre-migration vanilla prototype, not built
```

## World rendering

`BiomeRenderer` reads a `BiomeDefinition` and builds independent full-screen tile layers. Each layer owns:

- a depth and camera parallax factor;
- repeat behavior;
- optional X/Y drift;
- independent opacity and blend mode;
- a semantic kind (`trees`, `fog`, `shafts`, `foreground`, and so on).

The Emerald Forest layer art is produced at the game's 480×270 logical resolution by `ForestLayerPainter`. It creates a distant canopy, multiple trunk planes, additive light shafts, drifting low fog, undergrowth, and foreground framing. `BiomeRenderer` separately manages screen-space fireflies and pollen. Gameplay terrain is rendered in world space by `GameScene`, so grass-topped collision surfaces remain readable and correctly aligned.

All generated textures are deterministic. They are temporary art, but the renderer does not care whether a future layer comes from a procedural canvas, a hand-painted PNG, or a sprite atlas.

## Add a biome

1. Complete or add its entry in `src/game/data/biomes.ts`. Cave, Crystal, Deadwood, Sakura, and Arena already have typed palette/layer scaffolds.
2. Add a biome-specific painter alongside `ForestLayerPainter.ts`, or adapt the renderer to load authored layer textures for that biome.
3. Keep gameplay terrain/collision definitions separate from backdrop layers.
4. Pass the selected definition to `BiomeRenderer` when composing the zone scene.
5. Tune `parallax` first (far layers around `0.05–0.2`, middle around `0.3–0.7`, foreground around `1.05–1.2`), then drift/opacity/blending.
6. Choose a restrained particle palette and test silhouettes against the player, enemies, projectiles, and platform edges.

## Migration notes

Preserved concepts:

- three classes with distinct health/resources and four abilities each;
- first-letter spell selection and accuracy-sensitive typing;
- speed-based power from ×0.5 to ×2.0;
- suffix upgrades with release points at each completed word segment;
- HP/resource combat, enemy attack timers, guards, healing, focus, and spell effects;
- XP, levels, skill points, and per-ability ranks;
- double-jump and long-dash unlock fields for future bosses;
- six-biome progression intent and boss data scaffolding.

Changed foundation:

- Phaser Arcade Physics owns movement, collisions, camera, sprites, and effects;
- Vite/TypeScript modules replace script-order globals;
- the world is assembled from render layers instead of one static background;
- the HUD, typing panel, and upgrades remain DOM overlays for accessibility and iteration speed;
- the old implementation is retained under `legacy/` for reference only.

## Temporary placeholders

- heroes, enemies, spells, terrain details, and forest layers are code-generated pixel art;
- only Emerald Forest has a finished renderer; other biome definitions are scaffolds;
- boss encounters, gates, checkpoints, save data, audio, and full zone transitions are not migrated yet;
- the existing forest PNG is used only behind the title screen, never as the gameplay world.

## Recommended next steps

1. Replace generated hero/enemy art with sprite atlases while keeping the entity APIs.
2. Add checkpoints, death/respawn presentation, and persistent save slots.
3. Migrate bosses and connect double-jump/long-dash unlock encounters.
4. Build Cave as the second renderer to validate the biome painter/asset seam.
5. Add audio buses, spatial ambience, hit pause, camera impulses, and richer combat telegraphs.
6. Add automated parser/combat tests and Phaser scene smoke tests.
