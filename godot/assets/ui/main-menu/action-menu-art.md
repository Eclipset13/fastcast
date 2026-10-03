The active asset is `action-menu-frame.png`, edited with the built-in imagegen
tool from the previous panel. Its interior is transparent, with all painted
scenery removed. The original `action-menu-panel.png` remains as the source
reference and is no longer used by the menu. Both are RGBA (936 × 1681).

The scene trims the frame with AtlasTexture region `(78, 0, 780, 1654)` and
uses matching NinePatchRect nodes for PanelFrame and PanelGlow. A uniform scale
of `430 / 780` preserves the moon, diamonds, corners, and line thickness. The
top 400 and bottom 260 source pixels remain fixed; the middle rails tile
vertically. ActionMenu is 430 × 802 at `(1010, 4)` in the 1440 × 810 viewport.
The frame extends 10px past its layout at each end so the horizontal rails
reach within 8px of the screen edges; outer ornament glow bleeds off-screen.
PanelBackground is a separate solid navy ColorRect with 82% opacity. Buttons
use 10px gaps and taller rows. No illustration is used as the panel background.

`action_menu_panel.gdshader` recolors luminous ornament ink for each class.
`action_menu_glow.gdshader` uses the same transparent frame texture
for a separate, delayed glow. The frame, separators, and six icons are reusable
SVG assets, and buttons retain the original actions. No text or buttons are
baked into the frame PNG. Original character textures and global color grading
are preserved. The three persistent character light fields start at equal 62%
strength, follow each slot's position and scale, and transition to 100% for the
selected class and 31% for the other two. BACK restores the equal start glows.

Frame extraction prompt (built-in imagegen edit mode):

> Use case: background-extraction. Edit target: provided existing fantasy menu panel PNG. Make this a TRANSPARENT FRAME ONLY. Preserve the existing exact double rails, all corner filigree, diamond ornaments, hanging runes, top crescent moon medallion, bottom diamond anchor, purple/lavender luminous ink and their proportions. REMOVE ALL interior painted background: no navy fill, no clouds, no mist, no forest, no trees, no ruins, no silhouettes, no architecture, no landscape, no light blotches. Every non-ornament pixel inside the frame and outside the frame must have actual zero alpha, not a black/checkerboard-painted background. Keep the full perimeter as a front-facing flat rectangle, same composition and fine pixel-art details, no text, no buttons, no new objects. Output at original resolution or higher with transparency. Do not stretch the moon or diamonds. The application will place a separate solid translucent navy layer underneath and will slice the frame for an 802px-tall menu. Only remove scenery and interior fill while preserving the decorative frame.

Original source generation prompt (built-in mode):

> Use case: stylized-concept. Asset type: production PNG background for a Godot fantasy game action menu. Use the user attached image ONLY as a visual style reference, especially the tall panel on the right. Generate ONE isolated tall rectangular panel, front-on flat 2D, aspect ratio EXACTLY 430:774, ideally 860x1548 or higher. Fill almost the entire canvas, leave only 5 pixel transparent padding around outer glow. Dark navy almost-black translucent magic glass interior with very subtle painterly pixel-art mist and ruined castle silhouettes near bottom, readable empty middle. Thin luminous lavender and purple ornamental double vertical rails, delicate angular interlaced corner filigree, layered stepped ornamental horizontal borders. Small diamond rune jewels spaced along both rails, delicate hanging vertical threads. At top center in upper 15%: delicate hanging crescent moon medallion, small diamonds above/below; bottom center fine diamond rune pendant. Ornament detail distributed along entire height, restrained soft purple glow, finer geometry like the reference, handcrafted high quality fantasy pixel-art interface with crisp fine detail. The middle 25%-85% of panel must be empty dark space for live buttons. NO buttons, NO text, NO lettering, NO labels, NO close button, NO characters, NO objects outside panel, NO perspective, NO gold metal, NO thick stone border. Preserve transparent outside; interior should be dark translucent at about 90% opacity. Only this panel asset, not a screenshot or full scene. Save generated file and return its local path so it can be copied into the project.
