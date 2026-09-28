# Running mage

Generated with the built-in imagegen tool using `mage-walk.png` as identity reference.
Final asset: `mage-run.png`, 1536 x 1024 RGBA, four columns by two rows.
Transparent pixels retain background RGB data; the alpha channel is authoritative.

Eight running phases loop at 14 fps. Arms and staff swing; hair and coat trail behind.
Source cells: 384 x 512. The game slices a 312 x 352 rectangle from each cell:
x=40; y=120 for the first row and y=90 for the second row. This aligns the rows
while preserving the airborne phases. Foot anchor y=342 in the sliced frame.
Rendered frame height: 35 world pixels; physics collider remains 12 x 26.
The original walking sheet supplies the standing pose. Running frame 3 supplies
the dash pose; jumping now uses the separate sheet described in [JUMP.md](JUMP.md).
Dash silhouettes copy the pose, facing and scale, spawn every 28 ms while moving,
and fade out in 200 ms before being destroyed. They use a bright cyan additive
core and blue WebGL glow.

## Generation prompt

Create a NEW production-ready animation sprite sheet based on this character reference (white-haired horned mage with white coat and crystal staff).
Canvas 1536x1024, arranged 4 columns x 2 rows, EXACTLY eight full-body sprites.
The MOST IMPORTANT feature is WIDE TRANSPARENT GUTTERS: each cell is 384x512, each character must fit in a 240x360 rectangle centered in its cell, leaving at least 64px transparent on left and right, 76px above and below. Characters must look SMALL on the sheet with lots of empty transparent space. Do not enlarge to fill cells. Never crop staff/hair/boots.
Each sprite is a different consecutive phase of an energetic side-view run toward RIGHT. Torso leans forward, bent arms actively pump forward/back, staff tilts with the hand motion, knees drive high, feet have airborne phases. Long hair and coat tails stream strongly backward (LEFT) and billow with different shapes. Same character in all 8 frames, same scale, same anchor and same ground line inside each cell. Read frames left to right then next row. Right-foot contact/down/passing/flight then left-foot contact/down/passing/flight.
Preserve character's white/lavender hair and long coat, two dark horns, red eye, black belt and tall boots, dark staff with pale purple crystal. Crisp pixel art.
Genuinely transparent RGBA alpha background, no black rectangle, no checkerboard pixels, no scenery, no lines, no frame borders, no numbering, no text, no watermarks.

## Final transparency pass

Use case: background-extraction. Remove ALL background and ALL glow from this eight-frame sprite sheet. Output genuinely TRANSPARENT RGBA PNG. Make dark background, gradient, halos, purple fog and ALL non-character pixels alpha=0. Preserve the eight mage sprites exactly: same positions, same sizes, same layout 4 columns 2 rows, same 1536x1024 canvas, same poses, colors, face, hair, coat, horns, boots and staff. Preserve opaque dark boots/staff and white hair. Clean hard pixel edges with no fringe. Do not recompose, enlarge, rearrange, add borders, crop or redraw characters. Transparency everywhere outside character silhouettes, including gaps between limbs and staff.
