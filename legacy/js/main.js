/* Game — главный цикл, отрисовка кадра и обработка ввода. */

const Game = {
  mode: 'title', player: null, last: 0, touch: false, ctx: null,
  init() {
    UI.init(); UI.title();
    this.ctx = UI.el.cv.getContext('2d'); this.ctx.imageSmoothingEnabled = false;
    this.touch = ('ontouchstart' in window) && window.matchMedia('(pointer: coarse)').matches;
    if (this.touch) document.body.classList.add('touch');
    this.bindInput();
    UI.show('screenTitle');
    requestAnimationFrame(t => this.loop(t));
    this.debug();
  },
  begin(cls) {
    Sfx.init();
    this.player = Progression.newPlayer(cls);
    this.player.actor = makeActor(cls.id);
    World.init();
    this.player.x = World.bonfires[0].x + 24; this.player.y = GROUND;
    World.camX = 0;
    this.mode = 'world';
    UI.show('screenGame'); UI.showBattle(false); UI.hud();
  },
  toWorld() { this.mode = 'world'; UI.show('screenGame'); UI.showBattle(false); UI.hud(); World.keys.clear(); },

  loop(t) {
    const dt = Math.min(0.05, (t - this.last) / 1000 || 0); this.last = t;
    if (FX.hitStop > 0) FX.hitStop -= dt;               // хит-стоп: кадр замирает, но рисуется
    else if (!this.freeze) {
      if (this.mode === 'world' || this.mode === 'battle') Anim.update(dt);
      if (this.mode === 'world') World.update(dt);
      else if (this.mode === 'battle') Battle.update(dt);
    }
    if (this.mode === 'world' || this.mode === 'battle') this.draw();
    requestAnimationFrame(t2 => this.loop(t2));
  },
  draw() {
    const ctx = this.ctx;
    ctx.save();
    if (FX.shake > 0) ctx.translate(R(rnd(-FX.shake, FX.shake)), R(rnd(-FX.shake, FX.shake)));
    World.drawBackground(ctx);
    ctx.save(); ctx.translate(-R(World.camX), 0);
    World.drawScene(ctx);
    if (this.mode === 'battle') Battle.drawExtra(ctx);
    ctx.restore();
    World.drawOverlay(ctx);
    ctx.restore();
    FX.drawScreen(ctx);
  },

  bindInput() {
    const dirOf = e => ({ KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' })[e.code];
    window.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (this.mode === 'world') {
        const d = dirOf(e); if (d) { World.keys.add(d); e.preventDefault(); }
        if ((e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') && !e.repeat) { e.preventDefault(); World.jump(); }
        if ((e.key === 'Shift' || e.code === 'KeyK') && !e.repeat) { e.preventDefault(); World.dash(); }
        if (e.code === 'KeyU') UI.upgrade();
      } else if (this.mode === 'battle') {
        if (this.touch && e.target === UI.el.mobileInput && e.key.length === 1 && e.key !== ' ') return;
        const now = performance.now();
        if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); Battle.onRelease(now); return; }
        if (e.code === 'Escape') { Battle.onAbort(); return; }
        const m = /^Key([A-Z])$/.exec(e.code);   // e.code, а не e.key: работает и при русской раскладке
        if (m) { e.preventDefault(); Battle.onKey(m[1].toLowerCase(), now); }
      } else if (this.mode === 'upgrade' && (e.code === 'Escape' || e.code === 'KeyU')) this.toWorld();
      else if (this.mode === 'result' && (e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); this.toWorld(); }
    });
    window.addEventListener('keyup', e => { const d = dirOf(e); if (d) World.keys.delete(d); });
    window.addEventListener('blur', () => World.keys.clear());
    const mi = UI.el.mobileInput;
    mi.addEventListener('input', () => {
      const v = mi.value; mi.value = '';
      if (this.mode !== 'battle' || !v) return;
      const ch = v[v.length - 1].toLowerCase();
      if (ch === ' ') Battle.onRelease(performance.now()); else if (/[a-z]/.test(ch)) Battle.onKey(ch, performance.now());
    });
    UI.el.btnKeyboard.onclick = () => mi.focus();
    UI.el.btnRelease.onclick = () => Battle.onRelease(performance.now());
    UI.el.btnAbort.onclick = () => Battle.onAbort();
    for (const b of document.querySelectorAll('.pad button')) {
      const d = b.dataset.dir, act = b.dataset.act;
      b.addEventListener('pointerdown', e => { e.preventDefault(); if (d) World.keys.add(d); else if (this.mode === 'world') (act === 'jump' ? World.jump() : World.dash()); });
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => { if (d) World.keys.delete(d); });
    }
    UI.el.btnUpgrade.onclick = () => { if (this.mode === 'world') UI.upgrade(); };
    UI.el.btnUpgBack.onclick = () => this.toWorld();
    UI.el.btnContinue.onclick = () => this.toWorld();
    UI.el.btnResultUpgrade.onclick = () => UI.upgrade();
  },

  /* Отладка через параметры URL: ?auto=mage&zone=3&battle=1 — сразу в игру, в зону 3, в бой с ближайшим врагом. */
  debug() {
    const q = new URLSearchParams(location.search);
    const cls = CLASSES[q.get('auto')]; if (!cls) return;
    this.begin(cls);
    const z = World.zones[+q.get('zone') || 0];
    this.player.x = z.x + (q.get('x') ? +q.get('x') : z.pit ? z.pit[1] + 40 : 60); this.player.unlocks = { doubleJump: true, longDash: true };
    World.camX = clamp(this.player.x - VW / 2, 0, World.width - VW);
    World.curZone = z; World.setupAmbient(z);
    if (q.get('battle')) {
      const e = World.enemies.filter(en => en.zone === z && !en.dead && (!q.get('boss') || en.def.boss)).sort((a, b) => Math.abs(a.x - this.player.x) - Math.abs(b.x - this.player.x))[0];
      if (e) { this.player.x = e.x - 30; this.player.y = e.y; Battle.start(e); }
    }
    // Отладка поз и эффектов: anim=run|jump|dash|swing|channel, ab=<индекс способности>, cast=1 (напечатать слово целиком),
    // sim=<сек> (прокрутить симуляцию и заморозить кадр).
    const a = q.get('anim'), p = this.player, abi = +(q.get('ab') || 1);
    if (this.mode === 'battle') World.camX = clamp((Battle.pp.x + Battle.ep.x) / 2 - VW / 2, 0, World.width - VW);
    if (a || q.get('cast') || q.get('sim')) {
      Anim.t = 0.13;
      if (a === 'run') { p.moving = true; p.onGround = true; p.actor.play('run'); p.actor.t = 0.12; }
      if (a === 'jump') { p.onGround = false; p.vy = -300; p.actor.play('jump'); p.actor.t = 0.3; }
      if (a === 'dash') { p.dashT = 0.1; p.actor.play('dash'); }
      if (a === 'swing' && this.mode === 'battle') { Battle.castClip = p.actor.clips.melee ? 'melee' : 'cast'; p.actor.play(Battle.castClip); p.actor.t = 0.18; Battle.ps.cast = 0.2; }
      if (a === 'channel' && this.mode === 'battle') { const w = Battle.parser.candidates[abi].word.full; for (const ch of w.slice(0, -2)) Battle.onKey(ch, performance.now()); p.actor.play('channel'); p.actor.t = 0.4; for (let i = 0; i < 40; i++) { Battle.t += 1 / 60; Battle.drawExtra(this.ctx); FX.update(1 / 60); } }
      if (q.get('cast') && this.mode === 'battle') { const w = Battle.parser.candidates[abi].word.full; const t0 = performance.now(); [...w].forEach((ch, i) => Battle.onKey(ch, t0 + i * 90)); }
      const sim = +(q.get('sim') || 0);
      for (let i = 0; i < sim * 60; i++) { const dt = 1 / 60; if (FX.hitStop > 0) { FX.hitStop -= dt; continue; } Anim.update(dt); if (this.mode === 'battle') Battle.update(dt); else if (this.mode === 'world') World.update(dt); }
      this.freeze = true;
    }
  },
};

Assets.load().then(() => Game.init());
