/* FX — визуальные эффекты. Частицы, снаряды, кольца ударных волн, молнии, росчерки, свечение,
   всплывающие числа, эмиттеры (непрерывные источники), послеобразы, тряска, вспышка и хит-стоп.
   Мировые объекты рисуются внутри translate(-camX); экранные (flash) — после restore. */

const FX = {
  parts: [], projectiles: [], texts: [], slashes: [], rings: [], arcs: [], glows: [], emitters: [], ghosts: [], timers: [],
  shake: 0, flash: null, hitStop: 0, t: 0,
  clear() { for (const k of ['parts', 'projectiles', 'texts', 'slashes', 'rings', 'arcs', 'glows', 'emitters', 'ghosts', 'timers']) this[k] = []; this.shake = 0; this.flash = null; },
  after(sec, fn) { this.timers.push({ t: sec, fn }); },
  stop(sec) { this.hitStop = Math.max(this.hitStop, sec); },

  /* Одна частица: квадрат size, скорость, гравитация g, затухание drag, мерцание twinkle, цвет (или массив). */
  spawn(o) {
    const life = o.life ?? 0.6;
    this.parts.push({ x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0, life, max: life, size: Math.max(1, R(o.size ?? 2)), shrink: o.shrink ?? false,
      color: Array.isArray(o.color) ? o.color[Math.floor(Math.random() * o.color.length)] : (o.color || '#fff'), g: o.g ?? 0, drag: o.drag ?? 0, twinkle: o.twinkle ?? false, add: o.add ?? false });
  },
  burst(x, y, o = {}) {
    const n = o.n || 16;
    for (let i = 0; i < n; i++) {
      const a = o.angle != null ? o.angle + rnd(-(o.spread ?? 0.6), o.spread ?? 0.6) : rnd(0, Math.PI * 2), sp = rnd(0.3, 1) * (o.speed || 70);
      this.spawn({ x: x + rnd(-(o.jitter || 0), o.jitter || 0), y: y + rnd(-(o.jitter || 0), o.jitter || 0), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 0),
        life: rnd(0.5, 1) * (o.life || 0.7), size: rnd(0.5, 1) * (o.size || 2), color: o.color, g: o.gravity ?? 60, drag: o.drag ?? 0, shrink: o.shrink, twinkle: o.twinkle, add: o.add });
    }
  },
  /* Непрерывный источник: fn(dt, e) вызывается каждый кадр в течение dur секунд (dur < 0 — пока не удалят по id). */
  emit(id, dur, fn) { this.emitters = this.emitters.filter(e => e.id !== id); this.emitters.push({ id, t: 0, dur, fn }); },
  stopEmit(id) { this.emitters = this.emitters.filter(e => e.id !== id); },
  projectile(from, to, o = {}) {
    this.projectiles.push({ x: from.x, y: from.y, sx: from.x, sy: from.y, tx: to.x, ty: to.y, t: 0, dur: o.dur || 0.45, kind: o.kind || 'orb',
      color: o.color || '#fff', size: o.size || 3, trail: o.trail || o.color, onHit: o.onHit, wobble: o.wobble || 0, arc: o.arc || 0, spin: 0 });
  },
  text(x, y, str, color = '#fff', big = false) { this.texts.push({ x, y, str, color, big, life: 1.1, max: 1.1, vy: -18, vx: rnd(-4, 4) }); },
  /* Росчерк-полумесяц: центр, радиус, направление (угол середины дуги), цвет. */
  slash(x, y, o = {}) { this.slashes.push({ x, y, r: o.r || 18, ang: o.ang ?? 0, sweep: o.sweep ?? 2.2, dir: o.dir ?? 1, life: o.life || 0.18, max: o.life || 0.18, color: o.color || '#fff', w: o.w || 3, glow: o.glow }); },
  ring(x, y, o = {}) { this.rings.push({ x, y, r0: o.r0 || 2, r1: o.r1 || 30, life: o.dur || 0.35, max: o.dur || 0.35, color: o.color || '#fff', w: o.w || 2, ground: o.ground || false, alpha: o.alpha ?? 1 }); },
  arc(x1, y1, x2, y2, o = {}) { this.arcs.push({ x1, y1, x2, y2, life: o.life || 0.15, max: o.life || 0.15, color: o.color || '#cfe8ff', core: o.core || '#ffffff', jitter: o.jitter || 6, segs: o.segs || 9, w: o.w || 1, branches: o.branches ?? 2 }); },
  glow(x, y, o = {}) { this.glows.push({ x, y, r: o.r || 12, life: o.dur || 0.2, max: o.dur || 0.2, color: o.color || '#ffffff', alpha: o.alpha ?? 0.6 }); },
  /* Послеобраз: снимок функции отрисовки (актёр рисует себя тинтом). */
  ghost(drawFn, life = 0.3, color = '#8fd3ff') { this.ghosts.push({ drawFn, life, max: life, color }); },

  update(dt) {
    this.t += dt;
    for (const e of this.emitters) { e.t += dt; e.fn(dt, e); }
    this.emitters = this.emitters.filter(e => e.dur < 0 || e.t < e.dur);
    for (const p of this.parts) { p.vy += p.g * dt; if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; } p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    this.parts = this.parts.filter(p => p.life > 0);
    for (const pr of this.projectiles) {
      pr.t += dt; pr.spin += dt * 12;
      const k = Math.min(1, pr.t / pr.dur), e = k * k * (3 - 2 * k);
      pr.x = pr.sx + (pr.tx - pr.sx) * e; pr.y = pr.sy + (pr.ty - pr.sy) * e + Math.sin(pr.t * 30) * pr.wobble - Math.sin(k * Math.PI) * pr.arc;
      if (pr.kind === 'fire') { for (let i = 0; i < 3; i++) this.spawn({ x: pr.x + rnd(-2, 2), y: pr.y + rnd(-2, 2), vx: rnd(-20, 20) - (pr.tx - pr.sx) * 0.3, vy: rnd(-30, -5), life: rnd(0.2, 0.5), size: rnd(1, 3), color: ['#ff8c4a', '#ffb347', '#ff5a2a', '#ffe9a0'], g: -20, shrink: true }); if (Math.random() < 0.4) this.spawn({ x: pr.x, y: pr.y, vx: rnd(-6, 6), vy: rnd(-16, -6), life: 0.7, size: 2, color: ['#3a2a30', '#5a4048'], g: -6 }); }
      else if (pr.kind === 'ice') { for (let i = 0; i < 2; i++) this.spawn({ x: pr.x + rnd(-3, 3), y: pr.y + rnd(-3, 3), vx: rnd(-10, 10), vy: rnd(-10, 10), life: rnd(0.3, 0.6), size: 1, color: ['#8fd3ff', '#ffffff', '#c8f0ff'], g: 20, twinkle: true }); }
      else this.spawn({ x: pr.x + rnd(-1, 1), y: pr.y + rnd(-1, 1), vx: rnd(-8, 8), vy: rnd(-8, 8), life: 0.3, size: 1, color: pr.trail, g: 0 });
      if (k >= 1) { pr.done = true; if (pr.onHit) pr.onHit(pr.tx, pr.ty); }
    }
    this.projectiles = this.projectiles.filter(p => !p.done);
    for (const t of this.texts) { t.y += t.vy * dt; t.x += t.vx * dt; t.vy += 20 * dt; t.life -= dt; }
    this.texts = this.texts.filter(t => t.life > 0);
    for (const s of this.slashes) s.life -= dt; this.slashes = this.slashes.filter(s => s.life > 0);
    for (const r of this.rings) r.life -= dt; this.rings = this.rings.filter(r => r.life > 0);
    for (const a of this.arcs) a.life -= dt; this.arcs = this.arcs.filter(a => a.life > 0);
    for (const g of this.glows) g.life -= dt; this.glows = this.glows.filter(g => g.life > 0);
    for (const g of this.ghosts) g.life -= dt; this.ghosts = this.ghosts.filter(g => g.life > 0);
    this.shake = Math.max(0, this.shake - dt * 14);
    if (this.flash) { this.flash.life -= dt; if (this.flash.life <= 0) this.flash = null; }
    for (const tm of this.timers) { tm.t -= dt; if (tm.t <= 0) { tm.done = true; tm.fn(); } }
    this.timers = this.timers.filter(t => !t.done);
  },

  /* ---------- отрисовка в мировых координатах ---------- */
  drawGlow(ctx, x, y, r, color, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  },
  drawBack(ctx) {                                   // слой за персонажами: свечения, кольца на земле, послеобразы
    for (const g of this.glows) this.drawGlow(ctx, R(g.x), R(g.y), g.r, g.color, g.alpha * clamp(g.life / g.max, 0, 1));
    for (const r of this.rings) if (r.ground) this.drawRing(ctx, r);
    for (const g of this.ghosts) { ctx.globalAlpha = (g.life / g.max) * 0.55; g.drawFn(ctx, g.color); ctx.globalAlpha = 1; }
  },
  drawRing(ctx, r) {
    const k = 1 - r.life / r.max, rad = r.r0 + (r.r1 - r.r0) * (1 - (1 - k) * (1 - k));
    ctx.globalAlpha = r.alpha * (1 - k); ctx.strokeStyle = r.color; ctx.lineWidth = r.w;
    ctx.beginPath();
    if (r.ground) ctx.ellipse(R(r.x), R(r.y), rad, rad * 0.32, 0, 0, Math.PI * 2); else ctx.arc(R(r.x), R(r.y), rad, 0, Math.PI * 2);
    ctx.stroke(); ctx.globalAlpha = 1;
  },
  draw(ctx) {                                       // слой перед персонажами
    for (const r of this.rings) if (!r.ground) this.drawRing(ctx, r);
    for (const p of this.parts) {
      const k = p.life / p.max;
      ctx.globalAlpha = p.twinkle ? (Math.sin(this.t * 40 + p.x) > 0 ? 1 : 0.3) : (k < 0.3 ? 0.5 : 1);
      if (p.add) ctx.globalCompositeOperation = 'lighter';
      const s = p.shrink ? Math.max(1, R(p.size * k)) : p.size;
      ctx.fillStyle = p.color; ctx.fillRect(R(p.x), R(p.y), s, s);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
    for (const pr of this.projectiles) {
      const x = R(pr.x), y = R(pr.y), s = pr.size;
      if (pr.kind === 'fire') { this.drawGlow(ctx, x, y, s * 4, '#ff7a2a', 0.8); ctx.fillStyle = '#ff5a2a'; ctx.fillRect(x - s, y - s, s * 2, s * 2); ctx.fillStyle = '#ffd070'; ctx.fillRect(x - s + 1, y - s + 1, s * 2 - 2, s * 2 - 2); ctx.fillStyle = '#fff6d0'; ctx.fillRect(x - 1, y - 1, 2, 2); }
      else if (pr.kind === 'ice') { this.drawGlow(ctx, x, y, s * 3, '#8fd3ff', 0.6); ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(pr.ty - pr.sy, pr.tx - pr.sx)); ctx.fillStyle = '#8fd3ff'; ctx.fillRect(-s * 2, -2, s * 4, 4); ctx.fillStyle = '#ffffff'; ctx.fillRect(-s * 2, -1, s * 3, 2); ctx.fillStyle = '#5aa9ff'; ctx.fillRect(-s * 2, 1, s * 2, 1); ctx.restore(); }
      else { this.drawGlow(ctx, x, y, s * 3, pr.color, 0.7); ctx.fillStyle = pr.color; ctx.fillRect(x - s, y - s, s * 2, s * 2); ctx.fillStyle = '#fff'; ctx.fillRect(x - R(s / 2), y - R(s / 2), Math.max(1, s), Math.max(1, s)); }
    }
    for (const s of this.slashes) {
      const k = 1 - s.life / s.max;
      if (s.glow) this.drawGlow(ctx, R(s.x), R(s.y), s.r * 1.6, s.glow, 0.5 * (1 - k));
      ctx.save(); ctx.translate(R(s.x), R(s.y)); ctx.rotate(s.ang);
      const a0 = -s.sweep / 2 + s.sweep * Math.min(1, k * 1.6) * s.dir - (s.dir < 0 ? 0 : 0), span = s.sweep * 0.55;
      ctx.globalAlpha = 1 - k * k; ctx.strokeStyle = s.color; ctx.lineWidth = s.w; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, s.r * (0.8 + k * 0.4), a0 - span * 0.5, a0 + span * 0.5); ctx.stroke();
      ctx.lineWidth = Math.max(1, s.w - 2); ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, s.r * (0.8 + k * 0.4), a0 - span * 0.35, a0 + span * 0.35); ctx.stroke();
      ctx.restore(); ctx.globalAlpha = 1;
    }
    for (const a of this.arcs) {
      const k = a.life / a.max; if (Math.floor(this.t * 60) % 3 === 0 && k < 0.7) continue;
      ctx.globalAlpha = clamp(k * 1.5, 0, 1);
      for (let b = 0; b <= a.branches; b++) {
        const pts = [[a.x1, a.y1]]; const n = a.segs;
        for (let i = 1; i < n; i++) { const u = i / n; pts.push([a.x1 + (a.x2 - a.x1) * u + rnd(-a.jitter, a.jitter) * (b ? 1.6 : 1), a.y1 + (a.y2 - a.y1) * u + rnd(-a.jitter, a.jitter) * (b ? 1.6 : 1)]); }
        pts.push([a.x2, a.y2]);
        ctx.strokeStyle = b ? a.color : a.core; ctx.lineWidth = b ? a.w : a.w + 1; ctx.beginPath(); ctx.moveTo(R(pts[0][0]), R(pts[0][1]));
        for (const p of pts.slice(1)) ctx.lineTo(R(p[0]), R(p[1])); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    for (const t of this.texts) {
      ctx.globalAlpha = clamp(t.life / t.max * 1.5, 0, 1);
      ctx.font = `${t.big ? 'bold 12px' : '8px'} "Silkscreen", monospace`;
      const x = R(t.x), y = R(t.y);
      ctx.fillStyle = '#060510';
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]]) ctx.fillText(t.str, x + dx, y + dy);
      ctx.fillStyle = t.color; ctx.fillText(t.str, x, y);
    }
    ctx.globalAlpha = 1;
  },
  drawScreen(ctx) {
    if (this.flash) { ctx.fillStyle = this.flash.color; ctx.globalAlpha = clamp(this.flash.life / this.flash.max, 0, 1) * (this.flash.alpha ?? 0.55); ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
  },
};

/* ---------- Библиотека составных эффектов: каналы каста, выпуски, попадания, атаки врагов ---------- */
const Spells = {
  /* Цвета стихий по fx способности. */
  elem(fx) {
    return {
      spark: { main: '#ffe36b', hi: '#ffffff', lo: '#c9a020', glow: '#ffe36b' },
      fire:  { main: '#ff7a2a', hi: '#ffd070', lo: '#a8301a', glow: '#ff6a2a' },
      ice:   { main: '#8fd3ff', hi: '#ffffff', lo: '#4a80c8', glow: '#8fd3ff' },
      heal:  { main: '#8be9a8', hi: '#e6ffee', lo: '#3f9a5a', glow: '#8be9a8' },
      slash: { main: '#ffffff', hi: '#ffffff', lo: '#ff7a5a', glow: '#ff5a3a' },
      cleave:{ main: '#ffb060', hi: '#ffffff', lo: '#ff5a3a', glow: '#ff6a2a' },
      guard: { main: '#8fd3ff', hi: '#ffffff', lo: '#4a80c8', glow: '#5aa9ff' },
      iaido: { main: '#ffe9a0', hi: '#ffffff', lo: '#f0b45a', glow: '#f0b45a' },
      flurry:{ main: '#ffffff', hi: '#ffffff', lo: '#f0b45a', glow: '#f0b45a' },
    }[fx] || { main: '#ffffff', hi: '#ffffff', lo: '#888888', glow: '#ffffff' };
  },

  /* Канал: вызывается каждый кадр, пока игрок печатает. pr — прогресс 0..1; tip — кончик оружия; feet — точка ног. */
  channel(ctx, cls, fx, pr, feet, tip, side, t) {
    const E = this.elem(fx), I = 0.25 + pr;                          // интенсивность
    if (cls === 'mage') {
      // две руны под ногами, встречное вращение
      for (let ring = 0; ring < 2; ring++) {
        const rad = 14 + ring * 8, dir = ring ? -1 : 1, n = 10 + ring * 6;
        ctx.globalAlpha = (0.25 + 0.6 * pr) * (ring ? 0.7 : 1);
        for (let i = 0; i < n; i++) {
          const a = t * (1.6 + pr * 2) * dir + i * Math.PI * 2 / n;
          ctx.fillStyle = i % 3 === 0 ? E.hi : (ring ? '#b48cff' : E.main);
          ctx.fillRect(R(feet.x + Math.cos(a) * rad), R(feet.y + Math.sin(a) * rad * 0.32), i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
        }
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = E.main; ctx.globalAlpha = 0.15 + 0.35 * pr; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(R(feet.x), R(feet.y), 22, 7, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      // сфера посоха: свечение и стихийные частицы
      FX.drawGlow(ctx, R(tip.x), R(tip.y), 8 + 14 * pr, E.glow, 0.5 + 0.4 * pr);
      if (fx === 'fire') { for (let i = 0; i < 1 + pr * 3; i++) FX.spawn({ x: tip.x + rnd(-3, 3), y: tip.y + rnd(-3, 3), vx: rnd(-10, 10), vy: rnd(-40, -15) * I, life: rnd(0.3, 0.7), size: rnd(1, 3), color: ['#ff8c4a', '#ffb347', '#ff5a2a', '#ffe9a0'], g: -30, shrink: true }); if (Math.random() < pr) FX.spawn({ x: feet.x + rnd(-16, 16), y: feet.y, vx: 0, vy: rnd(-30, -10), life: 0.8, size: 2, color: ['#ff6a2a', '#ffb347'], g: -20, shrink: true }); }
      else if (fx === 'ice') { for (let i = 0; i < 1 + pr * 2; i++) FX.spawn({ x: tip.x + rnd(-14, 14) * I, y: tip.y - rnd(8, 24), vx: rnd(-6, 6), vy: rnd(8, 20), life: rnd(0.6, 1.2), size: rnd(1, 2), color: ['#8fd3ff', '#ffffff', '#c8f0ff'], g: 6, twinkle: true }); if (Math.random() < pr * 0.6) FX.spawn({ x: tip.x, y: tip.y, vx: rnd(-40, 40), vy: rnd(-40, 40), life: 0.35, size: 1, color: '#ffffff', drag: 6 }); }
      else if (fx === 'spark') { if (Math.random() < 0.2 + pr * 0.6) { const a = rnd(0, Math.PI * 2), d = 8 + rnd(0, 14) * I; FX.arc(tip.x, tip.y, tip.x + Math.cos(a) * d, tip.y + Math.sin(a) * d, { life: 0.08, jitter: 3, segs: 5, branches: 0, color: '#ffe36b' }); } if (Math.random() < pr) FX.spawn({ x: tip.x, y: tip.y, vx: rnd(-50, 50), vy: rnd(-50, 50), life: 0.25, size: 1, color: ['#ffe36b', '#ffffff'], drag: 8, add: true }); }
      else if (fx === 'heal') { for (let i = 0; i < 1 + pr * 2; i++) { const a = t * 3 + i; FX.spawn({ x: feet.x + Math.cos(a) * 14, y: feet.y - rnd(0, 6), vx: -Math.sin(a) * 10, vy: rnd(-30, -14) * I, life: rnd(0.7, 1.2), size: rnd(1, 2), color: ['#8be9a8', '#e6ffee', '#4fd07a'], g: -10, twinkle: true }); } }
      if (pr > 0.66 && Math.random() < 0.5) FX.spawn({ x: feet.x + rnd(-20, 20), y: feet.y - rnd(0, 50), vx: 0, vy: rnd(-20, -8), life: 0.4, size: 1, color: E.hi, add: true });
    } else if (cls === 'warrior') {
      // ярость: языки пламени от земли, угли, трещины, красное свечение
      FX.drawGlow(ctx, R(feet.x), R(feet.y - 22), 26 + 20 * pr, '#ff3a2a', 0.15 + 0.3 * pr);
      for (let i = 0; i < 1 + pr * 4; i++) FX.spawn({ x: feet.x + rnd(-14, 14), y: feet.y - rnd(0, 4), vx: rnd(-4, 4), vy: rnd(-50, -20) * I, life: rnd(0.3, 0.6), size: rnd(1, 3), color: ['#ff3a2a', '#ff7a2a', '#ffb060', '#8a1010'], g: -30, shrink: true });
      ctx.globalAlpha = 0.3 + 0.6 * pr; ctx.strokeStyle = '#ff5a3a'; ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) { const a = -0.3 + i * 0.75 + Math.PI * 0.15, len = 10 + pr * 18; ctx.beginPath(); ctx.moveTo(R(feet.x), R(feet.y)); ctx.lineTo(R(feet.x + Math.cos(a) * len), R(feet.y + Math.sin(a) * len * 0.35)); ctx.stroke(); }
      ctx.globalAlpha = 1;
      if (fx === 'guard') { ctx.globalAlpha = 0.3 + 0.5 * pr; ctx.strokeStyle = '#8fd3ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(R(feet.x + side * 10), R(feet.y - 24), 22 + Math.sin(t * 8) * 2, -1.2, 1.2); ctx.stroke(); ctx.globalAlpha = 1; }
      else FX.drawGlow(ctx, R(tip.x), R(tip.y), 6 + 10 * pr, '#ff5a3a', 0.4 + 0.5 * pr);
      if (pr > 0.5 && Math.random() < pr * 0.5) FX.spawn({ x: feet.x + rnd(-30, 30), y: feet.y - rnd(0, 60), vx: 0, vy: rnd(-40, -20), life: 0.4, size: 1, color: '#ffb060', add: true });
    } else {
      // фокус: золотые линии скорости, лепестки, блик по клинку, пульсирующее кольцо
      ctx.globalAlpha = 0.2 + 0.7 * pr; ctx.fillStyle = '#f0b45a';
      for (let i = 0; i < 6; i++) { const ly = feet.y - 8 - ((t * 90 + i * 13) % 50), lx = feet.x - side * (18 + i * 5 + ((t * 40 + i * 7) % 12)); ctx.fillRect(R(lx), R(ly), 6 + i * 2, 1); }
      ctx.globalAlpha = 0.25 + 0.5 * pr; ctx.strokeStyle = '#f0b45a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(R(feet.x), R(feet.y), 18 + Math.sin(t * 6) * 3 * pr, 6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      if (Math.random() < 0.3 + pr) FX.spawn({ x: feet.x + rnd(-30, 30), y: feet.y - rnd(20, 60), vx: -side * rnd(10, 30), vy: rnd(6, 16), life: rnd(0.8, 1.4), size: 2, color: ['#f4aacb', '#e07fae', '#ffd8e8'], g: 4, drag: 0.5 });
      const g = Math.sin(t * 5) * 0.5 + 0.5; FX.drawGlow(ctx, R(tip.x), R(tip.y), 4 + 8 * pr, '#ffe9a0', 0.3 + 0.6 * pr * g);
      if (pr > 0.5 && Math.random() < pr * 0.4) FX.spawn({ x: tip.x, y: tip.y, vx: rnd(-20, 20), vy: rnd(-20, 20), life: 0.3, size: 1, color: '#ffffff', add: true });
    }
  },

  /* Выпуск снаряда мага. Возвращает ничего; onHit вызовет impact. */
  fire(from, to, tier, onHit) {
    FX.glow(from.x, from.y, { r: 16, color: '#ff7a2a', dur: 0.25 });
    FX.burst(from.x, from.y, { n: 10, color: ['#ff8c4a', '#ffd070'], speed: 40, size: 2, life: 0.4, gravity: -20 });
    FX.projectile(from, to, { kind: 'fire', size: 3 + tier, dur: 0.45, arc: 12, onHit: (x, y) => {
      FX.stop(0.06 + tier * 0.02); FX.flash = { color: '#ff7a2a', life: 0.15, max: 0.15, alpha: 0.25 }; FX.shake = 4 + tier * 2;
      FX.glow(x, y, { r: 30 + tier * 10, color: '#ff7a2a', dur: 0.35, alpha: 0.9 });
      FX.ring(x, y, { r0: 4, r1: 26 + tier * 8, dur: 0.3, color: '#ffb060', w: 3 }); FX.ring(x, y, { r0: 2, r1: 16, dur: 0.2, color: '#ffffff', w: 2 });
      FX.burst(x, y, { n: 70 + tier * 30, color: ["#ff8c4a", "#ffb347", "#ff5a2a", "#ffe9a0", "#ffffff"], speed: 140, size: 2.5, life: 0.7, gravity: 40, drag: 2, shrink: true });
      FX.burst(x, y, { n: 12, color: ['#3a2a30', '#5a4048'], speed: 30, size: 3, life: 1, gravity: -20, up: 10 });
      onHit(x, y);
    } });
  },
  ice(from, to, tier, onHit) {
    FX.burst(from.x, from.y, { n: 8, color: ['#8fd3ff', '#ffffff'], speed: 30, size: 1, life: 0.4, twinkle: true, gravity: 0 });
    for (let i = 0; i <= tier; i++) FX.after(i * 0.07, () => FX.projectile({ x: from.x, y: from.y + rnd(-4, 4) }, { x: to.x + rnd(-4, 4), y: to.y + rnd(-6, 6) }, { kind: 'ice', size: 3, dur: 0.3, onHit: i === tier ? (x, y) => {
      FX.stop(0.05); FX.shake = 3 + tier; FX.glow(x, y, { r: 26, color: '#8fd3ff', dur: 0.3, alpha: 0.8 });
      FX.ring(x, y, { r0: 3, r1: 22 + tier * 6, dur: 0.25, color: '#c8f0ff', w: 2 });
      FX.burst(x, y, { n: 30 + tier * 10, color: ['#8fd3ff', '#ffffff', '#c8f0ff', '#5aa9ff'], speed: 90, size: 2, life: 0.9, gravity: 120, up: 40, twinkle: true });
      for (let s = 0; s < 6; s++) { const a = -Math.PI / 2 + rnd(-1.2, 1.2); FX.spawn({ x, y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, life: 0.5, size: 3, color: '#8fd3ff', g: 100, shrink: true }); }
      onHit(x, y);
    } : undefined }));
  },
  zap(from, to, tier, onHit) {
    for (let i = 0; i <= tier; i++) FX.arc(from.x, from.y, to.x + rnd(-4, 4), to.y + rnd(-6, 6), { life: 0.16 + i * 0.03, jitter: 7, segs: 10, branches: 2 + tier });
    FX.glow(from.x, from.y, { r: 14, color: '#ffe36b', dur: 0.15 }); FX.glow(to.x, to.y, { r: 18 + tier * 6, color: '#ffe36b', dur: 0.2, alpha: 0.9 });
    FX.flash = { color: '#ffffff', life: 0.08, max: 0.08, alpha: 0.18 }; FX.stop(0.04); FX.shake = 2 + tier;
    FX.burst(to.x, to.y, { n: 16 + tier * 8, color: ['#ffe36b', '#ffffff', '#ffb347'], speed: 90, size: 1, life: 0.4, gravity: 60, drag: 3, add: true });
    FX.after(0.05, () => onHit(to.x, to.y));
  },
  heal(feet, tier) {
    FX.ring(feet.x, feet.y, { r0: 4, r1: 30, dur: 0.5, color: '#8be9a8', w: 2, ground: true });
    FX.glow(feet.x, feet.y - 22, { r: 30, color: '#8be9a8', dur: 0.4, alpha: 0.6 });
    FX.emit('heal', 0.6, (dt, e) => { for (let i = 0; i < 3 + tier; i++) { const a = e.t * 8 + i * 2.1; FX.spawn({ x: feet.x + Math.cos(a) * (16 - e.t * 10), y: feet.y - e.t * 50 - rnd(0, 6), vx: 0, vy: -20, life: 0.5, size: rnd(1, 2), color: ['#8be9a8', '#e6ffee', '#4fd07a'], twinkle: true }); } });
  },
  guard(feet, side, tier) {
    FX.ring(feet.x + side * 8, feet.y - 24, { r0: 6, r1: 26 + tier * 4, dur: 0.4, color: '#8fd3ff', w: 3 });
    FX.glow(feet.x + side * 8, feet.y - 24, { r: 28, color: '#5aa9ff', dur: 0.5, alpha: 0.5 });
    FX.emit('guard', 0.5, (dt, e) => { for (let i = 0; i < 2; i++) { const a = rnd(-1.3, 1.3); FX.spawn({ x: feet.x + side * (10 + Math.cos(a) * 22), y: feet.y - 24 + Math.sin(a) * 22, vx: 0, vy: 0, life: 0.3, size: 2, color: ['#8fd3ff', '#ffffff'], twinkle: true }); } });
  },
  focus(feet) {
    FX.ring(feet.x, feet.y, { r0: 2, r1: 40, dur: 0.5, color: '#f0b45a', w: 2, ground: true }); FX.ring(feet.x, feet.y - 24, { r0: 2, r1: 30, dur: 0.4, color: '#ffe9a0', w: 2 });
    FX.glow(feet.x, feet.y - 24, { r: 36, color: '#f0b45a', dur: 0.4, alpha: 0.7 }); FX.flash = { color: '#f0b45a', life: 0.12, max: 0.12, alpha: 0.2 };
    FX.burst(feet.x, feet.y - 20, { n: 30, color: ['#f0b45a', '#ffe9a0', '#ffffff'], speed: 60, size: 2, life: 0.8, gravity: -30, drag: 2, add: true });
  },
  /* Удар ближнего боя по врагу: росчерк, искры, кольцо. hitY — уровень попадания. */
  slashHit(x, y, side, tier, fx) {
    const E = this.elem(fx);
    FX.slash(x, y, { r: 16 + tier * 6, ang: side > 0 ? 0 : Math.PI, sweep: 2.4, dir: 1, color: E.main, w: 3 + tier, glow: E.glow });
    FX.burst(x, y, { n: 12 + tier * 6, color: [E.hi, E.main, E.lo], speed: 110, size: 1.5, life: 0.4, gravity: 90, drag: 2, angle: side > 0 ? 0 : Math.PI, spread: 1.2 });
    FX.ring(x, y, { r0: 2, r1: 14 + tier * 4, dur: 0.18, color: '#ffffff', w: 2 });
    FX.stop(0.05 + tier * 0.02); FX.shake = 3 + tier * 1.5;
  },
  cleaveHit(x, y, feetY, side, tier) {
    this.slashHit(x, y, side, tier, 'cleave');
    FX.slash(x, y + 6, { r: 22 + tier * 8, ang: side > 0 ? 0.6 : Math.PI - 0.6, sweep: 2.6, dir: 1, color: '#ffb060', w: 4 + tier, glow: '#ff6a2a', life: 0.24 });
    FX.ring(x, feetY, { r0: 4, r1: 50 + tier * 14, dur: 0.45, color: '#ffb060', w: 3, ground: true });
    FX.burst(x, feetY, { n: 24 + tier * 8, color: ['#c9a070', '#8a6a40', '#ffffff'], speed: 60, size: 2, life: 0.8, gravity: 120, up: 60, jitter: 10 });
    FX.flash = { color: '#ffb060', life: 0.12, max: 0.12, alpha: 0.2 }; FX.stop(0.1 + tier * 0.03); FX.shake = 7 + tier * 2;
  },
  iaidoHit(x, y, feetY, side, tier) {
    FX.flash = { color: '#ffffff', life: 0.1, max: 0.1, alpha: 0.5 };
    FX.slash(x, y, { r: 26 + tier * 10, ang: side > 0 ? -0.3 : Math.PI + 0.3, sweep: 3.2, dir: 1, color: '#ffe9a0', w: 4 + tier, glow: '#f0b45a', life: 0.26 });
    FX.burst(x, y, { n: 26 + tier * 10, color: ['#ffffff', '#ffe9a0', '#f0b45a', '#f4aacb'], speed: 130, size: 2, life: 0.6, gravity: 80, drag: 2, angle: side > 0 ? -0.3 : Math.PI + 0.3, spread: 0.9 });
    FX.ring(x, y, { r0: 4, r1: 34 + tier * 10, dur: 0.3, color: '#ffe9a0', w: 2 });
    FX.emit('petals', 0.8, () => { if (Math.random() < 0.7) FX.spawn({ x: x + rnd(-30, 30), y: y - rnd(10, 40), vx: -side * rnd(10, 30), vy: rnd(10, 24), life: 1.2, size: 2, color: ['#f4aacb', '#e07fae', '#ffd8e8'], drag: 0.5 }); });
    FX.stop(0.12 + tier * 0.04); FX.shake = 6 + tier * 2;
  },
  /* Осечка мага: взрыв посоха. */
  miscastMage(tip, frac) {
    FX.flash = { color: '#ff8c4a', life: 0.25, max: 0.25, alpha: 0.5 }; FX.shake = 4 + frac * 12; FX.stop(0.1);
    FX.glow(tip.x, tip.y, { r: 30 + frac * 40, color: '#ff7a2a', dur: 0.4, alpha: 1 });
    FX.ring(tip.x, tip.y, { r0: 4, r1: 30 + frac * 40, dur: 0.4, color: '#ff8c4a', w: 3 }); FX.ring(tip.x, tip.y, { r0: 2, r1: 18, dur: 0.25, color: '#ffffff', w: 2 });
    FX.burst(tip.x, tip.y, { n: 30 + Math.round(frac * 60), color: ['#ff8c4a', '#ffb347', '#ffffff', '#ff3a3a', '#b48cff'], speed: 60 + frac * 140, size: 2.5, life: 0.9, gravity: 60, drag: 1.5, shrink: true });
    FX.burst(tip.x, tip.y, { n: 10, color: ['#3a2a30', '#5a4048'], speed: 30, size: 3, life: 1.2, gravity: -20 });
  },
  miscastWarrior(feet, side) {
    FX.burst(feet.x, feet.y, { n: 16, color: ['#c9a070', '#8a6a40'], speed: 50, size: 2, life: 0.6, gravity: 100, up: 30 });
    FX.emit('stars', 1.2, (dt, e) => { if (Math.random() < 0.4) { const a = e.t * 6; FX.spawn({ x: feet.x + Math.cos(a) * 12, y: feet.y - 52 + Math.sin(a) * 3, vx: 0, vy: 0, life: 0.3, size: 2, color: '#ffe36b', twinkle: true }); } });
  },
  miscastSamurai(feet, side) {
    FX.slash(feet.x, feet.y - 24, { r: 20, ang: side > 0 ? 2.4 : Math.PI - 2.4, sweep: 2, dir: 1, color: '#ff5f6d', w: 3, glow: '#ff2a3a' });
    FX.burst(feet.x, feet.y - 24, { n: 18, color: ['#ff5f6d', '#8a1020', '#ff2a3a'], speed: 50, size: 1.5, life: 0.8, gravity: 140 });
    FX.shake = 4; FX.stop(0.06);
  },
  /* Телеграф и удар врага. */
  enemyWindup(x, y, h, boss) {
    FX.glow(x, y - h * 0.6, { r: boss ? 40 : 20, color: '#ff3a3a', dur: 0.3, alpha: 0.5 });
    FX.burst(x, y, { n: boss ? 14 : 6, color: ['#8a6a40', '#c9a070'], speed: 30, size: 2, life: 0.5, gravity: 80, up: 30 });
  },
  enemyHit(px, py, kind) {
    FX.burst(px, py - 20, { n: 14, color: ['#ff5f6d', '#ffffff', '#ff2a3a'], speed: 70, size: 1.5, life: 0.5, gravity: 90 });
    FX.ring(px, py - 20, { r0: 2, r1: 18, dur: 0.2, color: '#ff8090', w: 2 }); FX.stop(0.06); FX.shake = 4;
    if (kind === 'knight') { FX.ring(px, py, { r0: 6, r1: 90, dur: 0.6, color: '#4ee8c0', w: 3, ground: true }); FX.burst(px, py, { n: 40, color: ['#c9a070', '#8a6a40', '#4ee8c0'], speed: 90, size: 2, life: 0.9, gravity: 140, up: 80, jitter: 20 }); FX.flash = { color: '#4ee8c0', life: 0.15, max: 0.15, alpha: 0.25 }; FX.shake = 10; FX.stop(0.1); }
    if (kind === 'warden') { FX.glow(px, py - 24, { r: 40, color: '#3fd66a', dur: 0.4, alpha: 0.8 }); FX.burst(px, py - 20, { n: 40, color: ['#3fd66a', '#a6ffbe', '#0b3a18'], speed: 80, size: 2, life: 0.8, gravity: -30, drag: 1.5, shrink: true }); FX.flash = { color: '#3fd66a', life: 0.15, max: 0.15, alpha: 0.25 }; FX.shake = 7; }
    if (kind === 'oni') { FX.emit('onifire', 0.6, () => { for (let i = 0; i < 6; i++) FX.spawn({ x: px + rnd(-22, 22), y: py, vx: rnd(-6, 6), vy: rnd(-160, -60), life: rnd(0.3, 0.7), size: rnd(2, 4), color: ['#ff3a2a', '#ff7a2a', '#ffb060', '#8a1010'], g: -40, shrink: true }); }); FX.ring(px, py, { r0: 6, r1: 70, dur: 0.5, color: '#ff6a5a', w: 3, ground: true }); FX.flash = { color: '#ff3a2a', life: 0.2, max: 0.2, alpha: 0.35 }; FX.shake = 12; FX.stop(0.12); }
  },
  /* Горение врага: пламя по силуэту. */
  burning(id, getPos, h) { FX.emit(id, -1, () => { const p = getPos(); for (let i = 0; i < 2; i++) FX.spawn({ x: p.x + rnd(-8, 8), y: p.y - rnd(0, h), vx: rnd(-4, 4), vy: rnd(-40, -20), life: rnd(0.3, 0.6), size: rnd(1, 3), color: ['#ff8c4a', '#ffb347', '#ff5a2a'], g: -30, shrink: true }); }); },
  /* Заморозка: ледяные кристаллы вокруг врага (рисуется в drawExtra). */
  drawFrozen(ctx, x, y, h, w, t) {
    ctx.globalAlpha = 0.4; ctx.fillStyle = '#8fd3ff'; ctx.fillRect(R(x - w / 2), R(y - h), R(w), R(h)); ctx.globalAlpha = 1;
    ctx.fillStyle = '#c8f0ff';
    for (let i = 0; i < 6; i++) { const cx = x - w / 2 + (i * 7 + 3) % w, base = y - (i * 11) % h; const hh = 6 + i % 3 * 3; ctx.beginPath(); ctx.moveTo(R(cx), R(base)); ctx.lineTo(R(cx - 3), R(base + 4)); ctx.lineTo(R(cx), R(base - hh)); ctx.lineTo(R(cx + 3), R(base + 4)); ctx.closePath(); ctx.fill(); }
    if (Math.random() < 0.3) FX.spawn({ x: x + rnd(-w / 2, w / 2), y: y - rnd(0, h), vx: 0, vy: 10, life: 0.6, size: 1, color: '#ffffff', twinkle: true });
  },
};
