/* World — платформер: карта из зон, физика игрока, патруль врагов, камера, костры, ворота боссов,
   плавное смешивание биомов на границах и отрисовка сцены. */

const World = {
  zones: [], plats: [], solids: [], enemies: [], bonfires: [], gates: [], width: 0,
  camX: 0, t: 0, keys: new Set(), ambient: [], lastBonfire: null, toast: null, curZone: null, hint: null,

  init() {
    this.zones = []; this.plats = []; this.solids = []; this.enemies = []; this.bonfires = []; this.gates = [];
    let x = 0;
    ZONES.forEach((z, zi) => {
      const zone = { ...z, x, zi, biome: Biomes.build(z.id) };
      this.zones.push(zone);
      const gx0 = z.pit ? x + z.pit[1] : x;
      this.plats.push({ x: gx0, y: GROUND, w: x + z.w - gx0, ground: true, zone });
      const plats = z.plats.map(([px, py, pw]) => { const p = { x: x + px, y: py, w: pw, zone }; this.plats.push(p); return p; });
      if (z.ledge) this.solids.push({ x, y: 120, w: 48, h: GROUND - 120, zone, need: 'doubleJump', hint: 'Нужен двойной прыжок' });
      if (z.bonfire != null) this.bonfires.push({ x: x + z.bonfire, y: GROUND, zone });
      for (const [type, ex, pi] of z.enemies) this.spawn(type, x + ex, pi >= 0 ? plats[pi].y : GROUND, zone, pi >= 0 ? plats[pi] : null);
      if (z.boss) {
        const b = this.spawn(z.boss[0], x + z.boss[1], GROUND, zone, null);
        const gate = { x: x + z.w - 14, y: 0, w: 6, h: VH, boss: b, zone };
        this.gates.push(gate); b.gate = gate;
      }
      x += z.w;
    });
    this.width = x;
    this.lastBonfire = this.bonfires[0];
    this.curZone = this.zones[0];
    this.setupAmbient(this.curZone);
  },

  spawn(type, x, y, zone, plat) {
    const def = ENEMIES[type], sc = TUNING.zoneScale(zone.zi);
    const e = { def, x, y, home: { x, y }, dir: 1, dead: false, respawn: 0, zone, hoverT: rnd(0, 6), face: -1, hurt: 0, actor: makeActor(def.skin),
      range: plat ? [plat.x + 6, plat.x + plat.w - 6] : [Math.max(zone.x + 20, x - 70), x + 70],
      speed: def.boss ? 0 : def.float ? 22 : 18,
      maxHp: R(def.hp * sc.hp), attack: def.attack * sc.attack, xp: R(def.xp * (1 + 0.2 * zone.zi)) };
    e.hp = e.maxHp;
    e.actor.play('idle'); e.actor.t = rnd(0, 2);
    this.enemies.push(e); return e;
  },

  zoneAt(x) { return this.zones.find(z => x >= z.x && x < z.x + z.w) || this.zones[this.zones.length - 1]; },
  activeSolids() { return this.solids.concat(this.gates.filter(g => !g.boss.dead)); },
  enemyY(e) { return e.def.float ? e.y - 14 + Math.sin(e.hoverT * 2) * 3 : e.y; },

  setupAmbient(zone) {
    const a = zone.biome.ambient; this.ambient = [];
    for (let i = 0; i < a.n; i++) this.ambient.push({ x: rnd(0, VW), y: rnd(0, VH), p: rnd(0, 6), c: a.colors[Math.floor(Math.random() * a.colors.length)] });
  },

  /* Прыжок и рывок вызываются из обработчика клавиш. */
  jump() {
    const p = Game.player;
    if (p.onGround || p.coyote > 0) { p.vy = -TUNING.physics.jump; p.onGround = false; p.coyote = 0; p.jumps = 1; Sfx.jump(); FX.burst(p.x, p.y, { n: 8, color: ['#ffffff', this.curZone.biome.ground.deco[0]], speed: 30, size: 1, life: 0.3 }); p.actor.play('jump', { restart: true }); }
    else if (p.unlocks.doubleJump && p.jumps > 0) { p.jumps--; p.vy = -TUNING.physics.jump * 0.9; Sfx.jump(); FX.ring(p.x, p.y - 4, { r0: 4, r1: 22, dur: 0.3, color: '#8fd3ff', w: 2, ground: true }); FX.burst(p.x, p.y - 4, { n: 12, color: ['#8fd3ff', '#ffffff'], speed: 40, size: 1, life: 0.4, gravity: 0 }); p.actor.play('jump', { restart: true }); }
  },
  /* Рывок доступен всегда: на земле без ограничений (с перезарядкой), в воздухе — один раз до приземления. */
  dash() {
    const p = Game.player, P = TUNING.physics;
    if (p.dashCd > 0 || (!p.onGround && p.airDashed)) return;
    if (!p.onGround) p.airDashed = true;
    p.dashT = p.unlocks.longDash ? P.longDashTime : P.dashTime; p.dashCd = P.dashCd; Sfx.dash();
    FX.burst(p.x, p.y - 16, { n: 10, color: ['#8fd3ff', '#ffffff'], speed: 40, size: 1, life: 0.3, gravity: 0 });
  },

  update(dt) {
    this.t += dt;
    this.updatePlayer(dt);
    if (Game.mode !== 'world') return;
    this.updateEnemies(dt);
    this.updateCamera(dt, Game.player.x + Game.player.face * 30);
    this.updateAmbient(dt);
    FX.update(dt);
    if (this.toast) { this.toast.t -= dt; if (this.toast.t <= 0) this.toast = null; }
    this.updateZone();
  },

  /* Текущая зона (для частиц, виньетки и подписи) переключается в середине полосы смешивания фонов. */
  blend() {
    const cx = this.camX + VW / 2, bw = TUNING.blendWidth;
    for (let i = 0; i < this.zones.length - 1; i++) {
      const b = this.zones[i + 1].x, t = (cx - (b - bw / 2)) / bw;
      if (t > 0 && t < 1) return { a: this.zones[i], b: this.zones[i + 1], t };
    }
    return null;
  },
  updateZone() {
    const bl = this.blend();
    const z = bl ? (bl.t < 0.5 ? bl.a : bl.b) : this.zoneAt(this.camX + VW / 2);
    if (z !== this.curZone) { this.curZone = z; this.toast = { text: z.name, t: 2.5 }; this.setupAmbient(z); }
  },

  updatePlayer(dt) {
    const p = Game.player, k = this.keys, P = TUNING.physics, half = 7, H = 40;
    const dir = (k.has('right') ? 1 : 0) - (k.has('left') ? 1 : 0);
    p.dashCd = Math.max(0, p.dashCd - dt);
    if (p.dashT > 0) { p.dashT -= dt; p.vx = p.face * P.dash; p.vy = 0; }
    else { p.vx = dir * P.run; if (dir) p.face = dir; p.vy = Math.min(P.maxFall, p.vy + P.gravity * dt); }
    p.moving = dir !== 0 && p.onGround;
    const solids = this.activeSolids();
    let nx = p.x + p.vx * dt;
    for (const s of solids) {
      if (p.y > s.y + 0.5 && p.y - H < s.y + s.h) {
        if (p.vx > 0 && p.x + half <= s.x && nx + half > s.x) { nx = s.x - half; if (s.hint && !p.unlocks[s.need]) this.hint = { text: s.hint, t: 1.5 }; }
        if (p.vx < 0 && p.x - half >= s.x + s.w && nx - half < s.x + s.w) nx = s.x + s.w + half;
      }
    }
    p.x = clamp(nx, half, this.width - half);
    let ny = p.y + p.vy * dt, grounded = false;
    if (p.vy >= 0) {
      for (const pl of this.plats) if (p.x + half > pl.x && p.x - half < pl.x + pl.w && p.y <= pl.y + 0.01 && ny >= pl.y) { ny = pl.y; grounded = true; }
      for (const s of solids) if (p.x + half > s.x && p.x - half < s.x + s.w && p.y <= s.y + 0.01 && ny >= s.y) { ny = s.y; grounded = true; }
    } else {
      for (const s of solids) if (p.x + half > s.x && p.x - half < s.x + s.w && p.y - H >= s.y + s.h && ny - H < s.y + s.h) { ny = s.y + s.h + H; p.vy = 0; }
    }
    if (p.moving && Math.random() < 0.25) FX.spawn({ x: p.x - p.face * 6, y: p.y - 1, vx: -p.face * rnd(5, 15), vy: -rnd(4, 10), life: 0.35, size: 1, color: this.curZone.biome.ground.deco[0] });
    if (grounded) {
      if (!p.onGround && p.vy > 150) { Anim.land(p.vy); FX.burst(p.x, p.y, { n: 8, color: this.curZone.biome.ground.deco, speed: 30, size: 1, life: 0.3 }); FX.ring(p.x, p.y, { r0: 2, r1: 16, dur: 0.25, color: '#ffffff', w: 1, ground: true, alpha: 0.5 }); }
      p.vy = 0; p.onGround = true; p.jumps = 1; p.airDashed = false; p.coyote = P.coyote;
    } else { p.onGround = false; p.coyote -= dt; }
    p.y = ny;
    if (this.hint) { this.hint.t -= dt; if (this.hint.t <= 0) this.hint = null; }
    if (p.y > VH + 30) this.fall();
    // костёр: лечит и запоминает точку возрождения
    for (const b of this.bonfires) if (Math.abs(b.x - p.x) < 16 && Math.abs(b.y - p.y) < 20) {
      if (this.lastBonfire !== b) { this.lastBonfire = b; this.toast = { text: 'Костёр запомнен', t: 1.5 }; }
      if (p.hp < p.maxHp) { p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.3 * dt); UI.hud(); }
    }
  },

  updateEnemies(dt) {
    const p = Game.player;
    for (const e of this.enemies) {
      if (e.dead) { if (!e.def.boss && Math.abs(e.x - p.x) > 320) { e.respawn -= dt; if (e.respawn <= 0) { e.dead = false; e.hp = e.maxHp; e.x = e.home.x; } } continue; }
      e.hoverT += dt; e.hurt = Math.max(0, e.hurt - dt);
      if (e.def.boss) e.face = p.x < e.x ? -1 : 1;
      else { e.x += e.dir * e.speed * dt; if (e.x < e.range[0]) { e.x = e.range[0]; e.dir = 1; } if (e.x > e.range[1]) { e.x = e.range[1]; e.dir = -1; } e.face = e.dir; }
      if (Math.abs(e.x - this.camX - VW / 2) < VW) { e.actor.play(e.def.boss ? 'idle' : 'run'); e.actor.update(dt); }
      const trig = e.def.boss ? 34 : 14;
      if (Math.abs(e.x - p.x) < trig && Math.abs(this.enemyY(e) - p.y) < 30) { Battle.start(e); return; }
    }
  },

  updateCamera(dt, targetX) {
    const target = clamp(targetX - VW / 2, 0, this.width - VW);
    this.camX += (target - this.camX) * Math.min(1, dt * 6);
  },

  updateAmbient(dt) {
    const a = this.curZone.biome.ambient;
    for (const f of this.ambient) {
      f.p += dt; f.y += a.vy * dt; f.x += (a.vx + Math.sin(f.p) * 6) * dt;
      if (f.y < -2) f.y = VH + 2; if (f.y > VH + 2) f.y = -2; if (f.x < -2) f.x += VW + 4; if (f.x > VW + 2) f.x -= VW + 4;
    }
  },

  fall() {
    const p = Game.player, b = this.lastBonfire;
    p.x = b.x + 16; p.y = b.y; p.vy = 0; p.hp = Math.max(1, p.hp - R(p.maxHp * 0.15));
    this.toast = { text: 'Бездна', t: 1.5 }; Sfx.hurt(); UI.hud();
  },

  /* Смерть в бою: возрождение у костра, обычные враги в мире оживают. */
  respawnAtBonfire() {
    const p = Game.player, b = this.lastBonfire;
    p.x = b.x + 16; p.y = b.y; p.vx = p.vy = 0; p.hp = p.maxHp; p.res = p.maxRes; p.focus = 0;
    for (const e of this.enemies) if (!e.def.boss) { e.dead = false; e.hp = e.maxHp; e.x = e.home.x; }
    this.camX = clamp(p.x - VW / 2, 0, this.width - VW);
  },

  /* ---------- отрисовка ---------- */
  /* Фон биома: фото-референс с зеркальным тайлингом (без швов) или процедурные слои, если файла нет. */
  drawBiome(ctx, biome, alpha) {
    ctx.globalAlpha = alpha;
    const im = Assets.images[biome.photo];
    if (im) {
      const w = im.width, off = -((this.camX * 0.5) % (2 * w));
      for (let k = 0; k < 4; k++) {
        const x = R(off + k * w);
        if (x > VW || x + w < 0) continue;
        if (k % 2) { ctx.save(); ctx.translate(x + w, 0); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0); ctx.restore(); }
        else ctx.drawImage(im, x, 0);
      }
    } else {
      for (const L of biome.layers) {
        const w = L.c.width, off = -((this.camX * L.s) % w);
        ctx.drawImage(L.c, R(off), 0); ctx.drawImage(L.c, R(off) + w, 0);
      }
    }
    ctx.globalAlpha = 1;
  },
  drawBackground(ctx) {
    const bl = this.blend();
    if (bl) { this.drawBiome(ctx, bl.a.biome, 1); this.drawBiome(ctx, bl.b.biome, bl.t); }
    else this.drawBiome(ctx, this.curZone.biome, 1);
  },
  /* Шов земли на границе зон: градиент между цветами соседних биомов. */
  drawSeams(ctx) {
    for (let i = 0; i < this.zones.length - 1; i++) {
      const zb = this.zones[i + 1], b = zb.x;
      if (zb.pit || b < this.camX - 80 || b > this.camX + VW + 80) continue;
      const ga = this.zones[i].biome.ground, gb = zb.biome.ground;
      const fill = ctx.createLinearGradient(b - 60, 0, b + 60, 0); fill.addColorStop(0, ga.fill); fill.addColorStop(1, gb.fill);
      ctx.fillStyle = fill; ctx.fillRect(b - 60, GROUND + 3, 120, VH - GROUND - 3);
      const top = ctx.createLinearGradient(b - 60, 0, b + 60, 0); top.addColorStop(0, ga.top); top.addColorStop(1, gb.top);
      ctx.fillStyle = top; ctx.fillRect(b - 60, GROUND, 120, 3);
    }
  },

  drawScene(ctx) {
    const cx0 = this.camX - 40, cx1 = this.camX + VW + 40, p = Game.player;
    for (const pl of this.plats) {
      if (pl.x + pl.w < cx0 || pl.x > cx1) continue;
      const g = pl.zone.biome.ground, rng = mulberry32(R(pl.x));
      if (pl.ground) {
        ctx.fillStyle = g.fill; ctx.fillRect(R(pl.x), pl.y, R(pl.w), VH - pl.y);
        ctx.fillStyle = g.top; ctx.fillRect(R(pl.x), pl.y, R(pl.w), 3);
        ctx.fillStyle = g.dark; for (let i = 0; i < pl.w / 6; i++) ctx.fillRect(R(pl.x + rng() * pl.w), pl.y + 6 + R(rng() * 24), 2 + R(rng() * 3), 1);
        for (let i = 0; i < pl.w / 14; i++) { ctx.fillStyle = g.deco[Math.floor(rng() * g.deco.length)]; ctx.fillRect(R(pl.x + rng() * pl.w), pl.y - 1, 1, 1); }
      } else {
        ctx.fillStyle = g.dark; ctx.fillRect(R(pl.x), pl.y, R(pl.w), 8);
        ctx.fillStyle = g.fill; ctx.fillRect(R(pl.x), pl.y, R(pl.w), 6);
        ctx.fillStyle = g.top; ctx.fillRect(R(pl.x), pl.y, R(pl.w), 2);
        for (let i = 0; i < pl.w / 12; i++) { ctx.fillStyle = g.deco[Math.floor(rng() * g.deco.length)]; ctx.fillRect(R(pl.x + rng() * pl.w), pl.y - 1, 1, 1); }
      }
    }
    this.drawSeams(ctx);
    for (const s of this.solids) {
      const g = s.zone.biome.ground;
      ctx.fillStyle = g.fill; ctx.fillRect(s.x, s.y, s.w, s.h); ctx.fillStyle = g.top; ctx.fillRect(s.x, s.y, s.w, 3); ctx.fillStyle = g.dark; ctx.fillRect(s.x + s.w - 3, s.y, 3, s.h);
    }
    for (const gt of this.gates) {
      if (gt.boss.dead) continue;
      const col = gt.zone.biome.gate;
      ctx.globalAlpha = 0.6 + Math.sin(this.t * 6) * 0.2; ctx.fillStyle = col;
      for (let y = 0; y < VH; y += 6) ctx.fillRect(gt.x + 2, y + (Math.floor(this.t * 20) % 6), 2, 3);
      ctx.globalAlpha = 1;
    }
    for (const b of this.bonfires) {
      FX.drawGlow(ctx, b.x, b.y - 6, 30 + Math.sin(this.t * 9) * 3, '#ffb060', 0.35);
      Pix.draw(ctx, Math.floor(this.t * 8) % 2 ? 'fire1' : 'fire2', b.x, b.y + 1, 1);
      if (Math.random() < 0.2) FX.spawn({ x: b.x + rnd(-2, 2), y: b.y - 8, vx: rnd(-4, 4), vy: -14, life: 0.8, size: 1, color: ['#ffb060', '#ffe36b'], g: -8 });
    }
    FX.drawBack(ctx);
    // враги
    const inBattle = Game.mode === 'battle' ? Battle.enemy : null;
    for (const e of this.enemies) {
      if (e.dead || e.x < cx0 - 80 || e.x > cx1 + 80) continue;
      let ex = e.x, ey = this.enemyY(e), face = e.face, feetY = e.y;
      if (e === inBattle) { ex = Battle.enemyDrawX(); ey = Battle.enemyY(); face = -Battle.side; feetY = Battle.ep.y; }
      Pix.shadow(ctx, ex, feetY, e.def.w * 0.9);
      const hurtFlash = e.hurt > 0 && Math.floor(this.t * 24) % 2 === 0;
      e.actor.draw(ctx, ex, ey, { flip: face < 0, tint: hurtFlash ? '#ffffff' : null });
      if (e.def.boss && !inBattle && Math.abs(e.x - p.x) < 200) {
        ctx.font = '8px "Silkscreen", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd0a0';
        ctx.fillText(e.def.name, R(e.x), R(e.y) - e.def.h - 8);
      }
    }
    // игрок
    const px = Game.mode === 'battle' ? Battle.playerDrawX() : p.x, py = Game.mode === 'battle' ? Battle.pp.y : p.y;
    Anim.drawPlayer(ctx, px, py);
    if (this.hint) { ctx.font = '8px "Silkscreen", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.fillText(this.hint.text, R(p.x), R(p.y) - 58); }
    FX.draw(ctx);
  },

  drawOverlay(ctx) {
    const b = this.curZone.biome, a = b.ambient;
    ctx.globalAlpha = 0.8; for (const f of this.ambient) { ctx.fillStyle = f.c; ctx.fillRect(R(f.x), R(f.y), a.size, a.size); } ctx.globalAlpha = 1;
    const v = ctx.createRadialGradient(VW / 2, VH / 2, 90, VW / 2, VH / 2, 320);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${b.vignette})`);
    ctx.fillStyle = v; ctx.fillRect(0, 0, VW, VH);
    if (this.toast) {
      ctx.globalAlpha = clamp(this.toast.t, 0, 1); ctx.font = 'bold 10px "Silkscreen", monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = '#060510'; ctx.fillText(this.toast.text, VW / 2 + 1, 25); ctx.fillStyle = '#ffffff'; ctx.fillText(this.toast.text, VW / 2, 24); ctx.globalAlpha = 1;
    }
  },
};
