/* CombatMath — множитель скорости печати, сила способности, кривая штрафа за ошибку. */

const CombatMath = {
  /* Множитель силы от скорости печати (символов/с): линейно от minMult до maxMult. */
  speedMult(cps) {
    const t = TUNING.typing;
    if (cps == null) return 1;
    const f = clamp((cps - t.slowCps) / (t.fastCps - t.slowCps), 0, 1);
    return t.minMult + (t.maxMult - t.minMult) * f;
  },
  /* Символов в секунду по временным меткам нажатий (performance.now()). */
  cpsFrom(times) {
    if (times.length < 2) return null;
    const sec = (times[times.length - 1] - times[0]) / 1000;
    return sec <= 0 ? TUNING.typing.fastCps : (times.length - 1) / sec;
  },
  abilityPower(ab, tier, mult, player) {
    return ab.baseDamage * TUNING.tierMult[tier] * mult
      * (1 + TUNING.levelDamageBonus * (player.level - 1))
      * (1 + TUNING.focusBonus * player.focus);
  },
  /* Доля штрафа 0..1: растёт с прогрессом в слове (степенная кривая) и с длиной слова. */
  penalty(cls, progress, fullLen) {
    const c = cls.miscast;
    return c.max * Math.pow(progress, c.exp) * clamp(fullLen / 12, 0.35, 1);
  },
};

/* Полное слово способности на текущем уровне прокачки: сегменты и границы (индексы, где можно «выпустить»). */
function buildWord(ab, level) {
  const segs = [ab.trigger, ...ab.suffixes.slice(0, level - 1)];
  const bounds = []; let n = 0;
  for (const s of segs) { n += s.length; bounds.push(n); }
  return { segs, full: segs.join(''), bounds };
}
