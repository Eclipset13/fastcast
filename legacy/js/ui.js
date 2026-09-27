/* UI — экраны (титул, игра, результат, прокачка), HUD и боевая панель. */

const UI = {
  el: {},
  init() { for (const el of document.querySelectorAll('[id]')) this.el[el.id] = el; },
  show(name) {
    for (const s of ['screenTitle', 'screenGame', 'screenResult', 'screenUpgrade']) this.el[s].hidden = s !== name;
    this.el.hud.hidden = name === 'screenTitle';
  },
  hud() {
    const p = Game.player; if (!p) return;
    const e = this.el;
    e.hudClass.textContent = p.cls.name; e.hudLevel.textContent = `Уровень ${p.level}`;
    e.hpFill.style.width = `${p.hp / p.maxHp * 100}%`; e.hpVal.textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;
    e.resLbl.textContent = p.cls.resource.short; e.resFill.style.setProperty('--res-color', p.cls.resource.color);
    e.resFill.style.width = `${p.res / p.maxRes * 100}%`; e.resVal.textContent = `${Math.floor(p.res)}/${p.maxRes}`;
    const need = TUNING.xpForLevel(p.level);
    e.xpFill.style.width = `${p.xp / need * 100}%`; e.xpVal.textContent = `${p.xp}/${need}`;
    e.spBadge.textContent = p.sp ? `· ${p.sp} ОУ` : '';
    e.unDouble.classList.toggle('on', p.unlocks.doubleJump); e.unDash.classList.toggle('on', p.unlocks.longDash);
    e.focusRow.hidden = p.cls.id !== 'samurai';
    if (p.cls.id === 'samurai') e.focusDots.innerHTML = [0, 1, 2, 3, 4].map(i => `<i class="${i < p.focus ? 'on' : ''}"></i>`).join('');
  },
  showBattle(on) {
    this.el.combatPanel.hidden = !on; this.el.gameGrid.classList.toggle('no-panel', !on);
    this.el.worldHint.hidden = on; this.el.padL.style.display = on ? 'none' : ''; this.el.padR.style.display = on ? 'none' : '';
    this.el.battleLog.innerHTML = '';
    if (on) { this.el.enName.textContent = Battle.enemy.def.name; this.word(); this.battleBars(); if (Game.touch) this.el.mobileInput.focus(); }
  },
  battleBars() {
    const E = Battle.E, e = this.el;
    e.enHpFill.style.width = `${E.hp / E.maxHp * 100}%`; e.enHpVal.textContent = `${Math.ceil(E.hp)}/${E.maxHp}`;
    const frac = E.lunge >= 0 ? 1 : 1 - E.timer / E.interval;
    e.enTimerFill.style.width = `${clamp(frac, 0, 1) * 100}%`;
    e.enTimerVal.textContent = E.lunge >= 0 ? 'удар!' : E.frozen ? `заморожен · ${E.timer.toFixed(1)} с` : `${Math.max(0, E.timer).toFixed(1)} с`;
    const m = Battle.parser.liveMult(performance.now());
    if (m == null) { e.speedFill.style.width = '0%'; e.speedVal.textContent = Battle.parser.isActive ? '×…' : '×—'; }
    else { const t = TUNING.typing; e.speedFill.style.width = `${(m - t.minMult) / (t.maxMult - t.minMult) * 100}%`; e.speedVal.textContent = `×${m.toFixed(2)}`; }
    this.hud();
  },
  word() {
    const P = Battle.parser, c = this.el.currentWord;
    if (!P.isActive) { c.innerHTML = `<span class="idle">Печатайте слово способности. Пробел — выпустить на границе сегмента.</span>`; return; }
    const { segs, bounds } = P.active.word; let idx = 0, html = '';
    const tiers = ['база', 'x1.6', 'x2.4'];
    segs.forEach((seg, si) => {
      let s = `<span class="seg ${P.typed >= bounds[si] ? 'done' : ''}" data-tier="${tiers[si]}">`;
      for (const ch of seg) { const cls = idx < P.typed ? 'ok' : idx === P.typed ? 'next' : 'rest'; s += `<span class="${cls}">${ch}</span>`; idx++; }
      html += s + '</span>';
    });
    if (bounds.includes(P.typed) && P.typed < P.active.word.full.length) html += `<span class="rel">Space → выпустить</span>`;
    c.innerHTML = html;
  },
  abilities() {
    const p = Game.player, P = Battle.parser;
    this.el.abilityList.innerHTML = P.candidates.map(c => {
      const ab = c.ability, lvl = p.abilities[ab.id].level;
      const word = c.word.segs.map((s, i) => i ? `<span class="sfx">${s}</span>` : s).join('');
      const active = P.active && P.active.ability.id === ab.id;
      const cls = active ? 'active' : P.isActive ? 'dim' : c.affordable ? '' : 'poor';
      const dmg = ab.baseDamage ? `${Math.round(CombatMath.abilityPower(ab, 0, 1, p))}–${Math.round(CombatMath.abilityPower(ab, lvl - 1, 2, p))}` : (ab.desc || '');
      return `<li class="ab ${cls}" data-ab="${ab.id}"><span class="name">${ab.name}${ab.desc && ab.baseDamage ? ` <span style="color:var(--muted);font-weight:400">· ${ab.desc}</span>` : ''}</span><span class="word">${word}</span><span class="meta">${ab.cost ? `${ab.cost} ${p.cls.resource.short}` : 'беспл.'}<br>${dmg}</span></li>`;
    }).join('');
  },
  flashPoor(id) { const li = this.el.abilityList.querySelector(`[data-ab="${id}"]`); if (li) { li.style.borderColor = 'var(--danger)'; setTimeout(() => li.style.borderColor = '', 250); } },
  log(msg, cls = '') { const d = document.createElement('div'); d.className = cls; d.innerHTML = msg; this.el.battleLog.prepend(d); while (this.el.battleLog.children.length > 12) this.el.battleLog.lastChild.remove(); },

  result(win) {
    const p = Game.player, st = Battle.stats, e = this.el, en = Battle.enemy;
    Game.mode = 'result';
    let ups = [];
    if (win) ups = Progression.gainXp(en.xp); else World.respawnAtBonfire();
    const final = win && en.def.final;
    e.resTitle.textContent = final ? 'Прототип пройден' : win ? (en.def.boss ? 'Страж повержен' : 'Победа') : 'Поражение';
    e.resLevelUp.hidden = !ups.length && !(win && en.def.unlock);
    e.resLevelUp.textContent = [ups.length ? `Уровень ${ups[ups.length - 1]}! +${ups.length} очко умений` : '', win && en.def.unlock ? `Открыто движение: ${en.def.unlockName}` : ''].filter(Boolean).join(' · ');
    const rows = [
      ['Противник', en.def.name], ['Опыт', win ? `+${en.xp}` : '0'], ['Приёмов выполнено', st.casts], ['Срывов', st.misses],
      ['Лучший множитель', st.bestMult ? `×${st.bestMult.toFixed(2)}` : '—'], ['Нанесено урона', Math.round(st.dmg)],
    ];
    if (!win) rows.push(['', 'Вы очнулись у костра. Опыт сохранён.']);
    if (final) rows.push(['', 'Они пал, алое небо гаснет. Спасибо за игру!']);
    e.resLines.innerHTML = rows.map(r => `<span>${r[0]}</span><span>${r[1]}</span>`).join('');
    e.btnResultUpgrade.hidden = p.sp === 0;
    this.show('screenResult'); this.hud();
  },

  upgrade() {
    const p = Game.player, e = this.el;
    Game.mode = 'upgrade'; World.keys.clear();
    e.spInfo.innerHTML = `Очков умений: <b class="mono">${p.sp}</b>. ${p.cls.miscast.title}: ${p.cls.miscast.desc}`;
    e.upgGrid.innerHTML = p.cls.abilities.map(ab => {
      const lvl = p.abilities[ab.id].level, max = 1 + ab.suffixes.length;
      const now = buildWord(ab, lvl), next = lvl < max ? buildWord(ab, lvl + 1) : null;
      const fmt = w => w.segs.map((s, i) => i ? `<span class="sfx">${s}</span>` : s).join('');
      const pow = t => ab.baseDamage ? Math.round(CombatMath.abilityPower(ab, t, 1, p)) : null;
      return `<div class="upg"><div><b>${ab.name}</b> <span class="lvl">ур. ${lvl}/${max}</span></div>
        <div class="w">${fmt(now)}</div>
        ${next ? `<div class="arrow">→ <span class="w">${fmt(next)}</span></div>` : '<div class="arrow">максимум</div>'}
        <div style="color:var(--muted)">${pow(0) != null ? `урон ×1: ${pow(0)}${next ? ` · с суффиксом: ${pow(lvl)}` : ''}` : ab.desc}</div>
        ${next ? `<button data-upg="${ab.id}" ${Progression.canUpgrade(ab) ? '' : 'disabled'}>Улучшить (1 ОУ)</button>` : ''}
      </div>`;
    }).join('');
    for (const b of e.upgGrid.querySelectorAll('[data-upg]')) b.onclick = () => { const ab = p.cls.abilities.find(a => a.id === b.dataset.upg); if (Progression.upgrade(ab)) { this.upgrade(); this.hud(); } };
    this.show('screenUpgrade');
  },

  title() {
    this.el.classCards.innerHTML = Object.values(CLASSES).map(c => `<button class="cls" data-cls="${c.id}">
      <canvas class="portrait" data-portrait="${c.id}" width="42" height="54" aria-hidden="true"></canvas>
      <h3>${c.name}</h3><div class="tag">${c.tagline}</div>
      <div class="stats"><span>HP ${c.hp}</span><span style="color:${c.resource.color}">${c.resource.name} ${c.resource.max}</span></div>
      <ul>${c.abilities.map(a => `<li><span>${a.name}</span><span class="mono">${a.trigger}${a.suffixes.map(s => `<span style="color:var(--muted)">·${s}</span>`).join('')}</span></li>`).join('')}</ul>
      <div class="mis"><b>Провал: ${c.miscast.title}.</b> ${c.miscast.desc}</div></button>`).join('');
    for (const cv of this.el.classCards.querySelectorAll('[data-portrait]')) {
      const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
      const a = makeActor(cv.dataset.portrait); a.play('idle'); a.t = 0.6; a.draw(g, 21, 52, {});
    }
    for (const b of this.el.classCards.querySelectorAll('[data-cls]')) b.onclick = () => Game.begin(CLASSES[b.dataset.cls]);
  },
};
