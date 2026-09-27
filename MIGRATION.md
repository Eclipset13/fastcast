# Migration snapshot

The active application is the Vite entry at `src/main.ts`. Nothing under `legacy/` is loaded by the new build.

The migration intentionally targets a vertical slice rather than duplicating every old zone at lower quality. Forest traversal, two standard encounters, three complete class loadouts, typing combat, suffix upgrades, XP, and level-up progression are operational. The remaining biome and boss records preserve the next integration points.

Architecture ownership:

- **Phaser scene:** world lifetime, physics, camera, terrain, entities, moment-to-moment effects.
- **Biome renderer:** parallax planes, repeat/drift, blend modes, atmosphere, particles.
- **Combat controller:** parser input, resource spending, casts, timers, damage and outcome.
- **Systems:** pure or state-focused rules that can be unit tested without rendering.
- **DOM UI:** class select, HUD, typing details, battle history, upgrade dialog, touch controls.

The generated Emerald Forest artwork is deliberately replaceable. Final art can be introduced one plane at a time by changing the layer texture source without modifying player physics or combat state.
