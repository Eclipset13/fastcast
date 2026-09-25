/* Progression — создание персонажа, опыт, уровни, очки умений и прокачка слов. */

const Progression = {
  newPlayer(cls) {
    const abilities = {}; for (const ab of cls.abilities) abilities[ab.id] = { level: 1 };
    return { cls, level: 1, xp: 0, sp: 0, hp: cls.hp, maxHp: cls.hp, res: cls.resource.max, maxRes: cls.resource.max, abilities, focus: 0,
      x: 0, y: GROUND, vx: 0, vy: 0, face: 1, onGround: false, jumps: 1, coyote: 0, dashT: 0, dashCd: 0, airDashed: false, moving: false,
      unlocks: { doubleJump: false, longDash: false } };
  },
  gainXp(n) {
    const p = Game.player; p.xp += n; const ups = [];
    while (p.xp >= TUNING.xpForLevel(p.level)) {
      p.xp -= TUNING.xpForLevel(p.level); p.level++; p.sp++;
      p.maxHp = Math.round(p.maxHp * 1.12); p.maxRes = Math.round(p.maxRes * 1.1);
      p.hp = p.maxHp; p.res = p.maxRes; ups.push(p.level);
    }
    return ups;
  },
  canUpgrade(ab) { const p = Game.player; return p.sp > 0 && p.abilities[ab.id].level < 1 + ab.suffixes.length; },
  upgrade(ab) { if (!this.canUpgrade(ab)) return false; Game.player.sp--; Game.player.abilities[ab.id].level++; return true; },
};
