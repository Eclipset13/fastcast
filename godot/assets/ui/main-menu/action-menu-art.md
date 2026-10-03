The panel was generated with the built-in imagegen tool using the attached
selected-menu reference. `action-menu-panel.png` is the original RGBA output
(936 × 1681); the scene uses an AtlasTexture region `(80, 8, 778, 1636)` to omit
the transparent outer margin and display the panel at 430 × 774. The source has
at least 1.8 times the effective display resolution and is imported losslessly. Original
character textures were preserved.

`action_menu_panel.gdshader` recolors luminous ornament ink for each class and
keeps the navy painted glass. `action_menu_glow.gdshader` uses the same texture
for a separate, delayed glow. The frame, separators, and six icons are reusable
SVG assets, and buttons retain the original actions. No text or buttons are
baked into the panel PNG.

Generation prompt (built-in mode):

> Use case: stylized-concept. Asset type: production PNG background for a Godot fantasy game action menu. Use the user attached image ONLY as a visual style reference, especially the tall panel on the right. Generate ONE isolated tall rectangular panel, front-on flat 2D, aspect ratio EXACTLY 430:774, ideally 860x1548 or higher. Fill almost the entire canvas, leave only 5 pixel transparent padding around outer glow. Dark navy almost-black translucent magic glass interior with very subtle painterly pixel-art mist and ruined castle silhouettes near bottom, readable empty middle. Thin luminous lavender and purple ornamental double vertical rails, delicate angular interlaced corner filigree, layered stepped ornamental horizontal borders. Small diamond rune jewels spaced along both rails, delicate hanging vertical threads. At top center in upper 15%: delicate hanging crescent moon medallion, small diamonds above/below; bottom center fine diamond rune pendant. Ornament detail distributed along entire height, restrained soft purple glow, finer geometry like the reference, handcrafted high quality fantasy pixel-art interface with crisp fine detail. The middle 25%-85% of panel must be empty dark space for live buttons. NO buttons, NO text, NO lettering, NO labels, NO close button, NO characters, NO objects outside panel, NO perspective, NO gold metal, NO thick stone border. Preserve transparent outside; interior should be dark translucent at about 90% opacity. Only this panel asset, not a screenshot or full scene. Save generated file and return its local path so it can be copied into the project.
