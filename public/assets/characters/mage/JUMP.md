# Mage jump and landing

Generated with the built-in imagegen tool, using `mage-walk.png` as the character reference.
Asset: `mage-jump.png`, 1536 x 1024 RGBA, 4 columns x 2 rows of 384 x 512 cells.
The alpha channel defines transparency; hidden RGB pixels may contain a backdrop.
Second-row sampling starts 10 pixels earlier to align the grounded soles across rows.
Rendered frame height is 40 world pixels, foot anchor 484; collision remains 12 x 26.

Frames: 0 preparation, 1 crouch, 2 push-off, 3 rise, 4 apex, 5 descent,
6 landing impact, 7 recovery. Air poses follow vertical velocity, so falling off
a ledge or landing on a platform does not play an unrelated timed jump loop.

Ground anticipation: 80 ms. Coyote-time and unlocked double jumps launch immediately.
Input buffer: 110 ms. Landing recovery: 170 ms, movement ramps from 60% to 100%.
Another jump or dash interrupts recovery; disabling control cancels pending actions.

Dash silhouettes now use an additive pale-cyan core and a blue WebGL glow,
with the existing 200 ms fade and automatic destruction. Canvas retains the core.

## Generation prompt

Use case: stylized-concept. Production pixel-art JUMP sprite sheet for a side-scrolling platform game, using supplied mage solely as identity reference.
Keep the same female mage: long white/lavender hair, two curved dark horns, red eye, white coat with long tails, black waist belt, dark thigh-high boots, dark staff with pale lavender crystal.
EXACTLY 8 distinct full-body poses in a FOUR columns by TWO rows grid on a 1536x1024 canvas. Each cell384x512. Wide transparent margins: each pose must fit inside local x=52..340, y=84..464; full staff, hair, horns, hands and boots all contained. Same body scale, torso anchor x=210, grounded soles baseline y=464 across both rows. Character height when standing around330px, crouched noticeably shorter, do NOT enlarge crouched poses to compensate.
Frames left to right, top then bottom:
0 anticipation slight squat, both knees bend, hips drop, free arm draws back, staff lowers.
1 deep push-off crouch, knees bent more, coat bunches, free arm swings forward.
2 takeoff extending legs, free arm actively swings UP forward, staff arm raises, hair and coat lag DOWN.
3 rising airborne, knees tucked, arms raised for upward momentum, staff tilted upward, coat trails below.
4 apex hovering pose, knees softly bent, free arm opens outward for balance, robe begins floating upward.
5 falling pose, legs extend downward ready to land, arms spread for balance, staff closer to body, hair and tails float UP.
6 landing impact crouch, both boots at baseline, knees flex, torso dips, arms lower absorbing impact, coat fans outward.
7 recovery half-crouch straightening toward standing, free arm settles, staff returns upright.
Important: these are jump phases with very DIFFERENT arm positions, not walking/running variations. Preserve facial identity, costume and clean pixel clusters. GENUINELY TRANSPARENT RGBA background alpha=0 everywhere outside sprites including between legs and staff. No glow background, no grid lines, no labels, no text, no scenery, no ground shadows.

## Targeted correction

Precise object edit. Fix ONLY the anatomy in the THIRD sprite of the TOP row (cell column3 row1). That pose currently has three arms/hands. REMOVE the extra low backward arm and its small peach hand beside the left hip, replacing that extra hand/sleeve with continuous flowing white hair/coat. Keep exactly TWO arms: the free arm raised up forward with open hand near the face, and the arm gripping the staff. Keep pose, face, staff, scale and position unchanged. Do not modify ANY of the other seven poses. Preserve exact1536x1024 canvas and 4x2 layout. Output genuinely TRANSPARENT RGBA alpha=0 everywhere outside sprites; no background glow or shadows.
