/* Rig — скелетная (cutout) анимация из пиксельных частей.
   Скин = набор частей (символьные матрицы + палитра + точка крепления к кости + порядок отрисовки).
   Скелет = иерархия костей со смещениями. Клип = ключевые кадры с углами костей (градусы) и сдвигами.
   Actor = проигрыватель клипов с плавным перетеканием между ними.
   Знаки углов: кость, висящая вниз (руки, ноги), уходит ВПЕРЁД при отрицательном угле;
   кость, стоящая вверх (торс, голова), наклоняется ВПЕРЁД при положительном. Персонаж смотрит вправо. */

const Rig = {
  cache: new Map(),

  /* Гуманоидный скелет; s — масштаб длин костей (боссы: 2). */
  humanoid(s = 1) {
    const L = { torso: 12 * s, upper: 8 * s, fore: 8 * s, thigh: 10 * s, shin: 12 * s };
    return {
      lengths: L,
      order: ['root', 'pelvis', 'torso', 'neck', 'head', 'hairB', 'cape', 'armB', 'foreB', 'weaponB', 'armF', 'foreF', 'weapon', 'legB', 'shinB', 'legF', 'shinF'],
      bones: {
        root:    { p: null, x: 0, y: 0 },
        pelvis:  { p: 'root', x: 0, y: -(L.thigh + L.shin) },
        torso:   { p: 'pelvis', x: 0, y: 0 },
        neck:    { p: 'torso', x: 0, y: -L.torso },
        head:    { p: 'neck', x: 0, y: 0 },
        hairB:   { p: 'head', x: -3 * s, y: -6 * s },
        cape:    { p: 'torso', x: -3 * s, y: -L.torso + 2 * s },
        armB:    { p: 'torso', x: -2 * s, y: -L.torso + 2 * s },
        foreB:   { p: 'armB', x: 0, y: L.upper },
        weaponB: { p: 'foreB', x: 0, y: L.fore },
        armF:    { p: 'torso', x: 2 * s, y: -L.torso + 2 * s },
        foreF:   { p: 'armF', x: 0, y: L.upper },
        weapon:  { p: 'foreF', x: 0, y: L.fore },
        legB:    { p: 'pelvis', x: -2 * s, y: 0 },
        shinB:   { p: 'legB', x: 0, y: L.thigh },
        legF:    { p: 'pelvis', x: 2 * s, y: 0 },
        shinF:   { p: 'legF', x: 0, y: L.thigh },
      },
    };
  },

  /* Offscreen-canvas части скина (кэш по скину/части/тинту). */
  part(skin, name, tint, frame = 0) {
    const key = `${skin.id}|${name}|${tint || ''}|${frame}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const def = skin.parts[name], rows = def.frames ? def.frames[frame] : def.rows, pal = Object.assign({}, skin.pal, def.pal || {});
    const w = Math.max(...rows.map(r => r.length)), h = rows.length;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    rows.forEach((row, y) => { [...row].forEach((ch, x) => {
      if (ch === '.' || ch === ' ') return;
      g.fillStyle = tint || pal[ch] || '#ff00ff'; g.fillRect(x, y, 1, 1);
    }); });
    this.cache.set(key, c); return c;
  },

  /* Значение кости в клипе на момент t: [rot°, dx, dy]. Отсутствующие кости = 0. */
  sample(clip, t) {
    const keys = clip.keys, len = clip.len;
    let T = clip.loop ? ((t % len) + len) % len : Math.min(t, len);
    let i = 0; while (i < keys.length - 1 && keys[i + 1].t <= T) i++;
    let k0 = keys[i], k1 = keys[i + 1], span, u;
    if (!k1) { if (clip.loop) { k1 = keys[0]; span = len - k0.t; } else return this.expand(k0.b); }
    else span = k1.t - k0.t;
    u = span > 0 ? clamp((T - k0.t) / span, 0, 1) : 1;
    if (k0.e !== 'linear') u = u * u * (3 - 2 * u);
    const out = {};
    const names = new Set([...Object.keys(k0.b), ...Object.keys(k1.b)]);
    for (const n of names) {
      const a = this.vec(k0.b[n]), b = this.vec(k1.b[n]);
      out[n] = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
    }
    return out;
  },
  vec(v) { return v == null ? [0, 0, 0] : typeof v === 'number' ? [v, 0, 0] : [v[0] || 0, v[1] || 0, v[2] || 0]; },
  expand(b) { const o = {}; for (const n in b) o[n] = this.vec(b[n]); return o; },
  lerpPose(a, b, u) {
    const out = {}, names = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const n of names) { const x = a[n] || [0, 0, 0], y = b[n] || [0, 0, 0]; out[n] = [x[0] + (y[0] - x[0]) * u, x[1] + (y[1] - x[1]) * u, x[2] + (y[2] - x[2]) * u]; }
    return out;
  },

  /* Мировые трансформации костей: {x, y, a} для каждой. */
  /* upright — {кость: мировой угол°}: кость держит заданный угол независимо от родителей (оружие в беге). */
  solve(skel, pose, extra, upright) {
    const W = {};
    for (const n of skel.order) {
      const b = skel.bones[n], v = pose[n] || [0, 0, 0];
      let rot = v[0] * Math.PI / 180, dx = v[1], dy = v[2];
      if (extra && extra[n]) { rot += extra[n][0] * Math.PI / 180; dx += extra[n][1] || 0; dy += extra[n][2] || 0; }
      if (!b.p) { W[n] = { x: dx, y: dy, a: rot }; continue; }
      const P = W[b.p], lx = b.x + dx, ly = b.y + dy, c = Math.cos(P.a), s = Math.sin(P.a);
      W[n] = { x: P.x + lx * c - ly * s, y: P.y + lx * s + ly * c, a: P.a + rot };
      if (upright && upright[n] != null) W[n].a = upright[n] * Math.PI / 180 + P.a * 0.15;
    }
    return W;
  },

  /* Отрисовка скина в позе. x, y — точка ног. */
  draw(ctx, skin, skel, pose, x, y, o = {}) {
    const W = this.solve(skel, pose, o.extra, o.upright);
    const parts = Object.entries(skin.parts).sort((a, b) => a[1].z - b[1].z);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.translate(R(x), R(y));
    if (o.flip) ctx.scale(-1, 1);
    const sc = (o.scale || 1) * (skin.drawScale || 1);
    if (sc !== 1) ctx.scale(sc, sc);
    for (const [name, def] of parts) {
      if (def.hidden && def.hidden(o)) continue;
      const B = W[def.bone]; if (!B) continue;
      const frame = def.frames ? Math.floor((o.t || 0) * (def.fps || 6)) % def.frames.length : 0;
      const c = this.part(skin, name, o.tint, frame);
      ctx.save(); ctx.translate(B.x, B.y); ctx.rotate(B.a + (def.rot || 0) * Math.PI / 180);
      ctx.drawImage(c, -def.pivot[0] + (def.ox || 0), -def.pivot[1] + (def.oy || 0));
      ctx.restore();
    }
    ctx.restore();
    return W;
  },
};

/* Проигрыватель клипов с перетеканием. */
class Actor {
  constructor(skin, skel, clips) { this.skin = skin; this.skel = skel; this.clips = clips; this.name = null; this.clip = null; this.t = 0; this.from = null; this.blend = 0; this.blendLen = 0.1; this.speed = 1; }
  play(name, o = {}) {
    if (this.name === name && !o.restart) return;
    const clip = this.clips[name]; if (!clip) return;
    if (this.clip) { this.from = this.pose(); this.blend = o.blend ?? this.blendLen; }
    this.name = name; this.clip = clip; this.t = 0; this.speed = o.speed || 1;
  }
  get done() { return this.clip && !this.clip.loop && this.t >= this.clip.len; }
  update(dt) { this.t += dt * this.speed; this.life = (this.life || 0) + dt; if (this.blend > 0) this.blend = Math.max(0, this.blend - dt); }
  pose() {
    if (!this.clip) return {};
    let p = Rig.sample(this.clip, this.t);
    if (this.blend > 0 && this.from) p = Rig.lerpPose(this.from, p, 1 - this.blend / this.blendLen);
    const rest = this.skin.rest;
    if (rest) for (const n in rest) { if (!this.clip.abs || !this.clip.abs.includes(n)) { p[n] = p[n] || [0, 0, 0]; p[n] = [p[n][0] + rest[n], p[n][1], p[n][2]]; } }
    return p;
  }
  /* Стабилизация оружия действует в клипах движения; клипы атак (abs) управляют оружием сами. */
  upright() {
    const u = this.skin.upright; if (!u || !this.clip) return null;
    const out = {}; for (const n in u) if (!this.clip.abs || !this.clip.abs.includes(n)) out[n] = u[n];
    return out;
  }
  draw(ctx, x, y, o = {}) { o.upright = this.upright(); if (o.t == null) o.t = this.life || 0; return Rig.draw(ctx, this.skin, this.skel, this.pose(), x, y, o); }
  /* Мировая точка кости (для эффектов: кончик посоха, кисть). len — смещение вдоль оси кости (вниз в локальных координатах). */
  bone(name, x, y, flip, len = 0) {
    const W = Rig.solve(this.skel, this.pose(), null, this.upright()); const b = W[name]; if (!b) return { x, y, a: 0 };
    const sc = this.skin.drawScale || 1;
    const tx = (b.x - Math.sin(b.a) * len) * sc, ty = (b.y + Math.cos(b.a) * len) * sc;
    return { x: x + (flip ? -tx : tx), y: y + ty, a: flip ? -b.a : b.a };
  }
  tip(name, len, x, y, flip) { return this.bone(name, x, y, flip, len); }
}
