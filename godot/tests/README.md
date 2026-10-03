Main-menu integration check (Godot 4.7.2):

```powershell
& 'D:\Programs\Godot\Godot_v4.7.2-stable_win64_console.exe' --headless --path godot --editor --import --quit
& 'D:\Programs\Godot\Godot_v4.7.2-stable_win64_console.exe' --headless --path godot --script res://tests/main_menu_smoke.gd
& 'D:\Programs\Godot\Godot_v4.7.2-stable_win64_console.exe' --headless --path godot --script res://tests/main_menu_check.gd
```

Run without `--headless`, with `--resolution 1440x810`, to capture real viewport
images under `godot/.godot/menu-review/`. The rendering run also verifies pure
white title pixels. The check selects all three classes, checks class accents
and hover, attempts BACK during entrance, verifies rune restoration happens
after character movement, and starts the existing gameplay scene for each class.
It also verifies three equal active start glows (62%), continuous selection
strengths (100% / 31% / 31%), restoration after BACK, a transparent frame
interior, 82% solid glass, full panel height, and uniform ornament scaling.

Review images include the initial menu and entrance, selected, and hovered
states and the restored state after BACK for each class. The generated images and logs stay in Godot's ignored
cache directory.
