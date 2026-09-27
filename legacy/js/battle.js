/* Battle — боевой цикл. Бой идёт прямо в мире: игрок остаётся на месте, враг встаёт напротив (side = ±1),
   камера центрируется между ними. Касты с эффектами по стихиям, провалы, ИИ врага с телеграфом и выпадом. */

const Battle = {
  parser: new TypingParser(), enemy: null, t: 0, over: false, stats: null, side: 1,
  pp: { x: 0, y: 0 }, ep: { x: 0, y: 0 }, ps: null, E: null, castClip: 'idle', passT: -1,

  start(e) {
    const p = Game.player;
    this.enemy = e;
    this.side = e.x >= p.x ? 1 : -1;
    p.face = this.side; p.vx = 0; p.dashT = 0;
    const dist = 22 + e.def.w / 2 + (e.def.boss ? 22 : 10);
    this.pp = { x: p.x, y: p.y };
    this.ep = { x: clamp(p.x + this.side * dist, 20, World.width - 20), y: p.y };
    this.E = { hp: e.hp, maxHp: e.maxHp, attack: e.attack, interval: e.def.interval, timer: e.def.interval, lunge: -1, lungeDur: e.def.boss ? 1.0 : 0.7, lungeMult: 1, frozen: 0, burn: null, enraged: false };
    this.ps = { stun: 0, guard: 0, bleed: null, hurt: 0, hurtAnim: 0, cast: 0, stagger: 0 };
    this.t = 0; this.over = false; this.passT = -1; this.parser.reset();
    this.stats = { casts: 0, misses: 0, bestMult: 0, dmg: 0 };
    FX.clear();
    e.actor.play('idle', { restart: true });
    Game.mode = 'battle';
    UI.showBattle(true);
    UI.log(`<b>${e.def.name}</b> ${e.def.boss ? 'преграждает путь' : 'нападает'}.`, 'hit');
    this.refreshCandidates();
    Sfx.init();
  },
  get height() { return this.enemy.def.h; },
  playerDrawX() {
    if (this.passT >= 0) { const k = clamp(this.passT / 0.15, 0, 1); return this.pp.x + this.side * (Math.abs(this.ep.x - this.pp.x) + 28) * k; }
    return this.pp.x;
  },
  enemyDrawX() { const l = this.E.lunge >= 0 ? Math.sin(this.E.lunge * Math.PI) : 0; return this.ep.x - this.side * l * (Math.abs(this.ep.x - this.pp.x) - 12 - this.enemy.def.w / 2); },
  enemyY() { return this.ep.y - (this.enemy.def.float ? 12 : 0); },
  hitPoint() { return { x: this.enemyDrawX(), y: this.enemyY() - this.height * 0.55 }; },

  refreshCandidates() {
    const p = Game.player;
    this.parser.setCandidates(p.cls.abilities.map(ab => ({ ability: ab, word: buildWord(ab, p.abilities[ab.id].level), affordable: p.res >= ab.cost })));
    UI.abilities();
  },

  onKey(ch, now) {
    if (this.over || this.ps.stun > 0 || this.ps.cast > 0) return;
    const ev = this.parser.key(ch, now);
    switch (ev.type) {
      case 'poor': UI.log(`Не хватает: ${Game.player.cls.resource.name.toLowerCase()} для «${ev.cand.ability.name}»`, 'bad'); UI.flashPoor(ev.cand.ability.id); break;
      case 'start': case 'progress': Sfx.key(this.parser.typed); UI.abilities(); if (ev.type === 'start') Game.player.actor.play('channel'); break;
      case 'complete': this.cast(ev.cand, ev.tier, ev.stats); break;
      case 'miss': this.miscast(ev); break;
    }
    UI.word();
  },
  onRelease(now) {
    if (this.over || this.ps.stun > 0 || this.ps.cast > 0) return;
    const r = this.parser.release(now);
    if (r) this.cast(r.cand, r.tier, r.stats);
    UI.word();
  },
  onAbort() {
    if (!this.parser.isActive) return;
    const ab = this.parser.active.ability, p = Game.player;
    p.res = Math.max(0, p.res - ab.cost);
    UI.log(`Отмена «${ab.name}»: потрачено ${ab.cost} ${p.cls.resource.short}`, 'bad');
    this.parser.reset(); this.refreshCandidates(); UI.word(); UI.hud();
  },

  /* Клип героя для приёма. */
  clipFor(ab) {
    const a = Game.player.actor.clips;
    const want = ab.kind === 'ranged' ? 'cast' : ab.kind === 'melee' ? 'melee' : ab.kind === 'guard' ? 'guard' : ab.kind === 'heal' ? 'support' : 'bounce';
    return a[want] ? want : 'bounce';
  },

  cast(cand, tier, st) {
    const p = Game.player, ab = cand.ability, E = this.E, e = this.enemy, S = this.side;
    p.res = Math.max(0, p.res - ab.cost);
    const mult = st.mult, power = CombatMath.abilityPower(ab, tier, mult, p);
    this.stats.casts++; this.stats.bestMult = Math.max(this.stats.bestMult, mult);
    const tierName = ['', ' (усил.)', ' (макс.)'][tier], cpsTxt = st.cps ? `${st.cps.toFixed(1)} с/с` : '—';
    this.parser.reset();
    this.castClip = this.clipFor(ab);
    p.actor.play(this.castClip, { restart: true });
    this.ps.cast = p.actor.clip.len;
    Sfx.cast();
    const PP = this.pp, tip = Anim.tip(PP.x, PP.y), hit = this.hitPoint(), eh = this.height;
    const hitEnemy = (dmg, color) => {
      if (this.over) return;
      E.hp = Math.max(0, E.hp - dmg); e.hp = E.hp; e.hurt = 0.15; this.stats.dmg += dmg;
      if (e.actor.clips.hurt && E.lunge < 0) e.actor.play('hurt', { restart: true });
      FX.text(hit.x, this.enemyY() - eh - 8, `-${Math.round(dmg)}`, color, dmg > 30);
      Sfx.hit();
      if (e.def.boss && !E.enraged && E.hp < E.maxHp * 0.5) { E.enraged = true; E.interval *= 0.75; UI.log(`${e.def.name} в ярости: атакует чаще!`, 'bad'); FX.flash = { color: '#ff3a3a', life: 0.3, max: 0.3, alpha: 0.3 }; }
      if (E.hp <= 0) this.end(true);
    };
    if (ab.kind === 'ranged') {
      const color = ab.fx === 'fire' ? '#ff8c4a' : ab.fx === 'ice' ? '#8fd3ff' : '#ffe36b';
      const go = () => {
        const from = Anim.tip(PP.x, PP.y), to = this.hitPoint();
        if (ab.fx === 'fire') Spells.fire(from, to, tier, () => { hitEnemy(power, color); E.burn = { left: 3, dps: ab.effect.burn * TUNING.tierMult[tier] * mult }; Spells.burning('burn', () => ({ x: this.enemyDrawX(), y: this.enemyY() }), eh); });
        else if (ab.fx === 'ice') Spells.ice(from, to, tier, () => { hitEnemy(power, color); if (!this.over) { E.frozen = 1; E.timer += ab.effect.freeze * TUNING.tierMult[tier]; UI.log('Враг заморожен: атака откладывается', 'good'); } });
        else Spells.zap(from, to, tier, () => hitEnemy(power, color));
      };
      FX.after(0.1, go);
    } else if (ab.kind === 'melee') {
      if (ab.fx === 'flurry') {
        for (let i = 0; i < 3; i++) FX.after(0.17 + i * 0.16, () => { p.actor.play('melee', { restart: true, speed: 2.4 }); const h = this.hitPoint(); Spells.slashHit(h.x, h.y + (i - 1) * 6, S, tier, 'flurry'); hitEnemy(power / 3, '#ffffff'); });
        this.ps.cast = 0.17 + 3 * 0.16 + 0.1;
      } else if (ab.fx === 'iaido') {
        this.passT = 0;
        FX.after(0.17, () => { const h = this.hitPoint(); Spells.iaidoHit(h.x, h.y, this.ep.y, S, tier); });
        FX.after(0.3, () => hitEnemy(power, '#ffe9a0'));
        FX.after(0.55, () => { this.passT = -1; FX.burst(PP.x, PP.y - 20, { n: 10, color: ['#f4aacb', '#ffffff'], speed: 30, size: 1, life: 0.4 }); });
        this.ps.cast = 0.6;
      } else if (ab.fx === 'cleave') {
        FX.after(0.2, () => { const h = this.hitPoint(); Spells.cleaveHit(h.x, h.y, this.ep.y, S, tier); hitEnemy(power, '#ffb060'); });
      } else {
        FX.after(0.17, () => { const h = this.hitPoint(); Spells.slashHit(h.x, h.y, S, tier, ab.fx); hitEnemy(power, '#ffffff'); });
      }
    } else if (ab.kind === 'heal') {
      p.hp = Math.min(p.maxHp, p.hp + power);
      Spells.heal(PP, tier); FX.text(PP.x, PP.y - 56, `+${Math.round(power)}`, '#8be9a8');
    } else if (ab.kind === 'guard') {
      this.ps.guard = [0.6, 0.75, 0.9][tier];
      Spells.guard(PP, S, tier); FX.text(PP.x, PP.y - 56, `щит ${Math.round(this.ps.guard * 100)}%`, '#8fd3ff');
    } else if (ab.kind === 'focus') {
      p.focus = Math.min(5, p.focus + 2);
      p.res = Math.min(p.maxRes, p.res + p.maxRes * [0.35, 0.55, 0.8][tier]);
      Spells.focus(PP); FX.text(PP.x, PP.y - 56, 'фокус', '#f0b45a');
    }
    if (p.cls.id === 'samurai' && ab.kind !== 'focus') p.focus = Math.min(5, p.focus + 1);
    UI.log(`${ab.name}${tierName}: ×${mult.toFixed(2)} (${cpsTxt})${ab.baseDamage ? ` → ${Math.round(power)}` : ''}`, 'good');
    if (e.def.riposte && Math.random() < e.def.riposte && E.lunge < 0) { E.timer = Math.min(E.timer, 0.6); UI.log(`${e.def.name} отвечает выпадом!`, 'bad'); }
    this.refreshCandidates(); UI.hud();
  },

  /* Провал комбинации: расплата зависит от класса и прогресса в слове. */
  miscast(ev) {
    const p = Game.player, cls = p.cls, ab = ev.cand.ability, full = ev.cand.word.full;
    const frac = CombatMath.penalty(cls, ev.progress, full.length), PP = this.pp;
    this.stats.misses++;
    p.res = Math.max(0, p.res - ab.cost * 0.5);
    Sfx.miss();
    const where = `«${full.slice(0, ev.at)}<u>${ev.got}</u>…» на ${ev.at}/${full.length}`;
    if (cls.miscast.type === 'explode') {
      const dmg = Math.round(frac * p.maxHp);
      p.hp = Math.max(0, p.hp - dmg); this.ps.hurt = 0.4; this.ps.hurtAnim = 0.3;
      Spells.miscastMage(Anim.tip(PP.x, PP.y), frac);
      FX.text(PP.x, PP.y - 60, `-${dmg}`, '#ff5f6d', true);
      UI.log(`Посох взорвался в руках! ${where}: −${dmg} HP`, 'bad'); Sfx.hurt();
    } else if (cls.miscast.type === 'stagger') {
      const stun = 0.5 + 2.0 * ev.progress;
      this.ps.stun = stun; this.ps.stagger = stun;
      this.startLunge(0.6 + 1.6 * ev.progress);
      Spells.miscastWarrior(PP, this.side);
      FX.text(PP.x, PP.y - 60, 'оглушён', '#ff5f6d');
      UI.log(`Потеря равновесия! ${where}: оглушение ${stun.toFixed(1)} с, враг контратакует`, 'bad');
    } else {
      const total = Math.round(frac * p.maxHp);
      this.ps.bleed = { left: 4, dps: total / 4 }; this.ps.hurtAnim = 0.3;
      const lost = p.focus; p.focus = 0;
      Spells.miscastSamurai(PP, this.side);
      FX.text(PP.x, PP.y - 60, `кровь ${total}`, '#ff5f6d');
      UI.log(`Клинок сорвался! ${where}: кровотечение −${total} за 4 с${lost ? `, потерян Фокус ×${lost}` : ''}`, 'bad'); Sfx.hurt();
    }
    this.parser.reset(); this.refreshCandidates(); UI.hud();
    if (p.hp <= 0) this.end(false);
  },

  startLunge(mult = 1) {
    const E = this.E, e = this.enemy;
    E.lunge = 0; E.lungeMult = mult; E.frozen = 0; FX.stopEmit('frozen');
    if (e.actor.clips.melee) e.actor.play('melee', { restart: true, speed: e.actor.clips.melee.len / E.lungeDur });
    Spells.enemyWindup(this.enemyDrawX(), this.ep.y, this.height, e.def.boss);
  },

  hitPlayer(dmg) {
    const p = Game.player, PP = this.pp;
    if (this.ps.guard) { dmg *= (1 - this.ps.guard); this.ps.guard = 0; UI.log('Стойка поглотила часть удара', 'good'); FX.ring(PP.x + this.side * 8, PP.y - 24, { r0: 20, r1: 34, dur: 0.25, color: '#8fd3ff', w: 3 }); }
    dmg = Math.round(dmg);
    p.hp = Math.max(0, p.hp - dmg); this.ps.hurt = 0.3; if (this.ps.stagger <= 0) this.ps.hurtAnim = 0.3;
    Spells.enemyHit(PP.x, PP.y, this.enemy.def.id);
    FX.text(PP.x, PP.y - 60, `-${dmg}`, '#ff5f6d', dmg > 20);
    Sfx.hurt(); UI.hud();
    if (p.hp <= 0) this.end(false);
  },

  update(dt) {
    World.updateCamera(dt, (this.pp.x + this.ep.x) / 2);
    World.updateAmbient(dt);
    const e = this.enemy;
    e.actor.update(dt);
    if (this.over) { FX.update(dt); return; }
    const p = Game.player, E = this.E, ps = this.ps;
    this.t += dt;
    if (this.passT >= 0) this.passT += dt;
    p.res = Math.min(p.maxRes, p.res + p.cls.resource.regen * dt);
    for (const k of ['stun', 'hurt', 'hurtAnim', 'cast', 'stagger']) ps[k] = Math.max(0, ps[k] - dt);
    e.hurt = Math.max(0, e.hurt - dt);
    if (ps.bleed) { p.hp = Math.max(0, p.hp - ps.bleed.dps * dt); ps.bleed.left -= dt; if (Math.random() < 0.3) FX.spawn({ x: this.pp.x + rnd(-4, 4), y: this.pp.y - rnd(10, 30), vx: 0, vy: 20, life: 0.5, size: 1, color: '#ff5f6d', g: 80 }); if (ps.bleed.left <= 0) ps.bleed = null; if (p.hp <= 0) { this.end(false); return; } }
    if (E.burn) { E.hp = Math.max(0, E.hp - E.burn.dps * dt); e.hp = E.hp; E.burn.left -= dt; if (E.burn.left <= 0) { E.burn = null; FX.stopEmit('burn'); } if (E.hp <= 0) { this.end(true); return; } }
    // ИИ врага: таймер → телеграф и выпад → урон на пике → возврат
    if (E.lunge < 0) {
      E.timer -= dt;
      if (E.timer <= 0) this.startLunge(1);
      else if (e.hurt <= 0 && (!e.actor.clip || e.actor.done)) e.actor.play('idle');
    } else {
      const prev = E.lunge; E.lunge += dt / E.lungeDur;
      if (prev < 0.5 && E.lunge >= 0.5) this.hitPlayer(E.attack * rnd(0.9, 1.15) * E.lungeMult);
      if (E.lunge >= 1) { E.lunge = -1; E.timer = E.interval; e.actor.play('idle'); }
    }
    if (ps.stun > 0 && this.parser.isActive) { this.parser.reset(); UI.word(); }
    if (Math.floor(this.t * 4) !== Math.floor((this.t - dt) * 4)) this.refreshCandidates();
    FX.update(dt);
    UI.battleBars();
  },

  end(win) {
    if (this.over) return;
    this.over = true;
    const e = this.enemy, p = Game.player;
    this.parser.reset(); UI.word(); FX.stopEmit('burn'); this.passT = -1;
    if (win) {
      const x = this.enemyDrawX(), y = this.enemyY(), h = this.height, w = e.def.w;
      e.dead = true; e.respawn = TUNING.respawnSec;
      FX.flash = { color: '#ffffff', life: 0.2, max: 0.2, alpha: e.def.boss ? 0.6 : 0.3 }; FX.stop(e.def.boss ? 0.25 : 0.1); FX.shake = e.def.boss ? 10 : 5;
      FX.ring(x, y - h / 2, { r0: 4, r1: h, dur: 0.5, color: '#ffffff', w: 3 });
      FX.emit('death', 0.7, (dt, em) => { for (let i = 0; i < (e.def.boss ? 10 : 4); i++) FX.spawn({ x: x + rnd(-w / 2, w / 2), y: y - rnd(0, h), vx: rnd(-30, 30), vy: rnd(-60, -10), life: rnd(0.5, 1.1), size: rnd(1, 3), color: ['#ffffff', '#8fd3ff', '#ffe36b', '#b48cff'], g: -20, twinkle: true }); });
      UI.log(`${e.def.name} повержен. +${e.xp} XP`, 'good');
      if (e.def.unlock) { p.unlocks[e.def.unlock] = true; UI.log(`Открыто: ${e.def.unlockName}!`, 'good'); }
    } else { UI.log('Вы пали…', 'bad'); FX.flash = { color: '#ff5f6d', life: 0.6, max: 0.6 }; this.ps.hurtAnim = 2; }
    FX.after(1.2, () => UI.result(win));
  },

  /* Дополнительная отрисовка поверх сцены: канал каста, заморозка, метка оглушения. */
  drawExtra(ctx) {
    const E = this.E, ps = this.ps, p = Game.player;
    if (!this.over && this.parser.isActive && ps.cast <= 0) {
      const pr = this.parser.typed / this.parser.active.word.full.length;
      Spells.channel(ctx, p.cls.id, this.parser.active.ability.fx, pr, this.pp, Anim.tip(this.pp.x, this.pp.y), this.side, this.t);
    }
    if (E.frozen) Spells.drawFrozen(ctx, this.enemyDrawX(), this.enemyY(), this.height, this.enemy.def.w + 10, this.t);
    if (ps.stun > 0) { ctx.font = 'bold 10px "Silkscreen", monospace'; ctx.fillStyle = '#ff5f6d'; ctx.textAlign = 'center'; ctx.fillText(`ОГЛУШЕНИЕ ${ps.stun.toFixed(1)}`, R(this.pp.x), R(this.pp.y) - 66); }
    if (this.passT >= 0 && this.passT < 0.3 && Math.floor(this.t * 60) % 2 === 0) { const x = this.playerDrawX(); const pose = p.actor.pose(); FX.ghost((c, col) => Rig.draw(c, p.actor.skin, p.actor.skel, pose, x, this.pp.y, { flip: p.face < 0, tint: col }), 0.3, '#ffe9a0'); }
  },
};
