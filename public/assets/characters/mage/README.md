# Horned mage

Generated with the built-in imagegen tool using the character reference supplied in chat.

`mage-walk.png`: transparent RGBA PNG, 1448 x 1086; 4 columns x 2 rows;
each frame is 362 x 543 pixels. Eight walking poses, read row-first, facing right.
The original walk sheet is preserved; frame 1 supplies the resting pose.
Movement now uses the more energetic `mage-run.png` cycle; see [RUN.md](RUN.md)
for slicing, animation settings and generation prompts.
Idle display height is 36 world pixels; collision size remains 12 x 26 world pixels.

Jumping now uses `mage-jump.png`: preparation, launch, airborne poses and landing.
See [JUMP.md](JUMP.md) for timings, slicing and the final generation prompts.

## Generation prompt

Use case: stylized-concept
Asset type: production-ready pixel-art game character sprite sheet for a Phaser side-scrolling platformer.
Input image: the user's attached white-haired horned mage is the character identity and costume reference.
Primary request: create a coherent eight-frame looping WALK CYCLE of exactly this female mage facing RIGHT in side view. Preserve her long white/lavender hair, two dark curved horns, red eye, white robe with long flowing tails and wide sleeves, black belt and thigh-high dark boots, and dark staff topped with a pale lavender crystal in a silver fork.
Layout: exactly 4 columns by 2 rows of equal 256x384 cells on a 1024x768 canvas, frames read left-to-right top row then bottom row. No borders or labels. One full-body sprite per cell. Identical scale and alignment across frames; torso centred at local x=128; boot soles baseline local y=352; horns at roughly y=35. Staff and hair stay completely inside each cell with clear margins.
Animation: eight distinct consecutive walking phases: right-foot contact, down, passing, up, left-foot contact, down, passing, up. Legs visibly alternate front/back, boots lift and plant, trailing hair and coat gently swing with inertia, holding staff consistently in front. No horizontal drift. Only subtle vertical bob. Last frame loops smoothly to first. Same face, horns, hair length, outfit and proportions in all frames.
Style: crisp low-resolution pixel-art clusters, limited lavender/white/charcoal palette, readable silhouette at small game scale. No painterly blur, no smooth airbrush glow.
Background: genuinely transparent RGBA alpha, including between legs and around staff. No black backdrop, no checkerboard drawn into pixels, no shadows on ground, no scene, no text or watermark.
