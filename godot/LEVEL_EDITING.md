# Visual level editing

Open `scenes/levels/emerald_forest.tscn` in Godot and use the **2D** workspace.

## Platforms

Every platform under `Terrain` is an instance of `scenes/world/forest_platform.tscn`.

- Select a platform and drag it in the 2D viewport to move it.
- Press `Ctrl+D` to duplicate it.
- Delete it normally to remove it.
- Change **Platform Kind** in the Inspector to switch between Long, Medium A, Medium B, Small A and Small B.
- The platform collision automatically follows the selected art.

Platform root position is the center of its walkable surface. This keeps visual placement and collision placement together.

## Map structure

- `Background`: parallax backdrop system.
- `Terrain`: ground, boundaries and platforms.
- `Decorations`: trees, stones and other non-gameplay art.
- `Enemies`: enemy scene instances.
- `Portals`: gates and exits.
- `Player`: player start position.
- `HUD`: screen-space interface.

Keep gameplay logic inside reusable scenes/scripts. Keep level-specific positions inside this `.tscn` file so visual edits made in Godot remain the source of truth.

After changing the map, save the scene, commit and push it. The updated node positions and properties can then be read directly from Git.
