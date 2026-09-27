/* Clips — ключевые кадры анимаций. Углы в градусах, root — [0, dx, dy].
   Конвенция знаков (см. rig.js): руки/ноги вперёд = отрицательно, торс/голова вперёд = положительно,
   плащ назад = положительно. Оружие: угол относительно предплечья; клипы с abs:['weapon'] задают его абсолютно. */

const CLIPS = {
  humanoid: {
    idle: { len: 2.0, loop: true, keys: [
      { t: 0,   b: { torso: 0, head: 0, armF: 6, foreF: 4, armB: -6, foreB: 4, cape: 4, hairB: 2, root: [0, 0, 0] } },
      { t: 1.0, b: { torso: 2, head: -2, armF: 9, foreF: 6, armB: -9, foreB: 6, cape: 8, hairB: 5, root: [0, 0, -1] } },
    ] },
    run: { len: 0.48, loop: true, keys: [
      { t: 0,    b: { legF: -32, shinF: 12, legB: 36, shinB: 48, armF: 32, foreF: 38, armB: -38, foreB: 34, torso: 12, head: 4, cape: 28, hairB: 20, root: [0, 0, -1] } },
      { t: 0.12, b: { legF: -4, shinF: 42, legB: 2, shinB: 24, armF: 0, foreF: 24, armB: 0, foreB: 24, torso: 10, head: 2, cape: 34, hairB: 26, root: [0, 0, -3] } },
      { t: 0.24, b: { legF: 36, shinF: 48, legB: -32, shinB: 12, armF: -38, foreF: 34, armB: 32, foreB: 38, torso: 12, head: 4, cape: 28, hairB: 20, root: [0, 0, -1] } },
      { t: 0.36, b: { legF: 2, shinF: 24, legB: -4, shinB: 42, armF: 0, foreF: 24, armB: 0, foreB: 24, torso: 10, head: 2, cape: 34, hairB: 26, root: [0, 0, -3] } },
    ] },
    jump: { len: 0.3, loop: false, keys: [
      { t: 0,   b: { legF: -20, shinF: 40, legB: 20, shinB: 30, armF: -60, foreF: -20, armB: 60, foreB: 20, torso: -4, head: -4, cape: 30, hairB: 20 } },
      { t: 0.3, b: { legF: -42, shinF: 70, legB: 24, shinB: 55, armF: -140, foreF: -20, armB: 130, foreB: 10, torso: -6, head: -6, cape: 60, hairB: 40 } },
    ] },
    fall: { len: 0.3, loop: false, keys: [
      { t: 0,   b: { legF: -30, shinF: 50, legB: 24, shinB: 40, armF: -130, foreF: -10, armB: 120, foreB: 10, torso: 0, head: 0, cape: 80, hairB: 50 } },
      { t: 0.3, b: { legF: -12, shinF: 28, legB: 26, shinB: 18, armF: -110, foreF: 0, armB: 110, foreB: 0, torso: 6, head: 4, cape: 120, hairB: 70 } },
    ] },
    land: { len: 0.2, loop: false, keys: [
      { t: 0,   b: { legF: -26, shinF: 52, legB: 28, shinB: 52, torso: 22, head: 6, armF: 20, foreF: 10, armB: -20, foreB: 10, cape: -10, hairB: -20, root: [0, 0, 5] } },
      { t: 0.2, b: { torso: 0, armF: 6, armB: -6, cape: 4, root: [0, 0, 0] } },
    ] },
    dash: { len: 0.25, loop: false, keys: [
      { t: 0,    b: { torso: 28, head: 4, legF: 42, shinF: 24, legB: -34, shinB: 10, armF: 56, foreF: 20, armB: -58, foreB: 20, cape: 96, hairB: 80, root: [0, 0, 2] } },
      { t: 0.25, b: { torso: 28, head: 4, legF: 42, shinF: 24, legB: -34, shinB: 10, armF: 56, foreF: 20, armB: -58, foreB: 20, cape: 96, hairB: 80, root: [0, 0, 2] } },
    ] },
    hurt: { len: 0.3, loop: false, keys: [
      { t: 0,    b: { torso: -18, head: -16, armF: -40, foreF: -30, armB: 40, foreB: -30, legF: -10, legB: 10, cape: -30, hairB: -30, root: [0, -2, 0] } },
      { t: 0.3,  b: { torso: 0, head: 0, armF: 6, armB: -6, cape: 4 } },
    ] },
    stagger: { len: 0.6, loop: true, keys: [
      { t: 0,   b: { torso: -12, head: -10, armF: -40, foreF: -20, armB: 30, foreB: -20, legF: -12, shinF: 20, legB: 14, shinB: 20, root: [0, -2, 1] } },
      { t: 0.3, b: { torso: 12, head: 10, armF: 30, foreF: -20, armB: -40, foreB: -20, legF: 12, shinF: 20, legB: -14, shinB: 20, root: [0, 2, 1] } },
    ] },
    bounce: { len: 0.4, loop: false, keys: [                         // лечение / стойка / дзен: подскок с разведёнными руками
      { t: 0,   b: { torso: 0, armF: -40, foreF: -40, armB: 40, foreB: -40, root: [0, 0, 0] } },
      { t: 0.15, b: { torso: -4, armF: -120, foreF: -20, armB: 120, foreB: -20, legF: -10, shinF: 20, legB: 10, shinB: 20, root: [0, 0, -6] } },
      { t: 0.4, b: { torso: 0, armF: 6, armB: -6, root: [0, 0, 0] } },
    ] },
  },

  /* Магичка: посох в передней руке (grip посередине), сфера вверх. */
  mage: {
    channel: { len: 0.8, loop: true, abs: ['weapon'], keys: [
      { t: 0,   b: { armF: -150, foreF: -20, weapon: 176, armB: 40, foreB: -30, torso: -4, head: -6, cape: 16, hairB: 12, legF: -6, legB: 6, root: [0, 0, -3] } },
      { t: 0.4, b: { armF: -154, foreF: -16, weapon: 184, armB: 46, foreB: -34, torso: 2, head: -8, cape: 26, hairB: 22, legF: -6, legB: 6, root: [0, 0, -5] } },
    ] },
    cast: { len: 0.4, loop: false, abs: ['weapon'], keys: [
      { t: 0,   b: { armF: -150, foreF: -20, weapon: 176, armB: 40, foreB: -30, torso: -4, head: -6, cape: 16, root: [0, 0, -3] } },
      { t: 0.1, b: { armF: -100, foreF: 0, weapon: 180, armB: 50, foreB: -20, torso: 16, head: 6, legF: -20, shinF: 10, legB: 20, shinB: 20, cape: -10, hairB: -10, root: [0, 3, 0] }, e: 'linear' },
      { t: 0.4, b: { armF: 6, foreF: 4, weapon: 0, armB: -6, foreB: 4, torso: 0, cape: 4 } },
    ] },
    support: { len: 0.4, loop: false, abs: ['weapon'], keys: [
      { t: 0,   b: { armF: -30, foreF: -10, weapon: 0, armB: 30, foreB: -10, root: [0, 0, 0] } },
      { t: 0.15, b: { armF: -60, foreF: -30, weapon: 0, armB: 70, foreB: -30, torso: -4, legF: -10, shinF: 20, legB: 10, shinB: 20, root: [0, 0, -6] } },
      { t: 0.4, b: { armF: 6, foreF: 4, weapon: 0, armB: -6, foreB: 4, root: [0, 0, 0] } },
    ] },
  },

  /* Берсерк: меч на плече (rest weapon 180 = клинок вдоль предплечья). */
  warrior: {
    channel: { len: 0.6, loop: true, abs: ['weapon', 'armF', 'foreF'], keys: [
      { t: 0,   b: { armF: 150, foreF: -34, weapon: 200, armB: -40, foreB: -40, torso: -8, head: -6, legF: -14, shinF: 10, legB: 16, shinB: 10, cape: 20, root: [0, 0, 0] } },
      { t: 0.3, b: { armF: 156, foreF: -30, weapon: 204, armB: -46, foreB: -44, torso: -12, head: -8, legF: -14, shinF: 10, legB: 16, shinB: 10, cape: 28, root: [0, 1, 0] } },
    ] },
    melee: { len: 0.45, loop: false, abs: ['weapon', 'armF', 'foreF'], keys: [
      { t: 0,    b: { armF: 160, foreF: -30, weapon: 180, armB: -40, foreB: -40, torso: -14, head: -8, legF: 12, legB: -12, cape: 20, root: [0, -2, 0] } },
      { t: 0.12, b: { armF: 172, foreF: -24, weapon: 180, armB: -50, foreB: -40, torso: -20, head: -10, legF: 14, legB: -14, cape: 30, root: [0, -3, 0] } },
      { t: 0.2,  b: { armF: -70, foreF: -10, weapon: 180, armB: 40, foreB: 20, torso: 26, head: 10, legF: -36, shinF: 20, legB: 34, shinB: 34, cape: -20, root: [0, 6, 0] }, e: 'linear' },
      { t: 0.45, b: { armF: 30, foreF: -170, weapon: 170, armB: -6, foreB: 4, torso: 0, head: 0, cape: 4, root: [0, 0, 0] } },
    ] },
    guard: { len: 0.4, loop: false, abs: ['weapon', 'armF', 'foreF'], keys: [
      { t: 0,   b: { armF: 30, foreF: -170, weapon: 170 } },
      { t: 0.12, b: { armF: -40, foreF: -120, weapon: 150, armB: 20, foreB: -30, torso: 8, legF: -16, shinF: 30, legB: 18, shinB: 30, root: [0, 0, 3] } },
      { t: 0.4, b: { armF: 30, foreF: -170, weapon: 170, torso: 0, root: [0, 0, 0] } },
    ] },
  },

  /* Самурай: катана в передней руке, в покое опущена назад. */
  samurai: {
    channel: { len: 0.7, loop: true, abs: ['weapon'], keys: [
      { t: 0,    b: { armF: 34, foreF: -70, weapon: 200, armB: -20, foreB: -30, torso: 6, head: 2, legF: -12, shinF: 16, legB: 12, shinB: 16, cape: 10, root: [0, 0, 1] } },
      { t: 0.35, b: { armF: 38, foreF: -74, weapon: 204, armB: -24, foreB: -34, torso: 8, head: 3, legF: -12, shinF: 16, legB: 12, shinB: 16, cape: 16, root: [0, 0, 2] } },
    ] },
    melee: { len: 0.42, loop: false, abs: ['weapon'], keys: [
      { t: 0,    b: { armF: 40, foreF: -60, weapon: 200, armB: -20, foreB: -30, torso: 10, legF: -20, shinF: 40, legB: 20, shinB: 40, cape: 10, root: [0, 0, 2] } },
      { t: 0.1,  b: { armF: 44, foreF: -64, weapon: 204, armB: -24, foreB: -30, torso: 12, legF: -22, shinF: 42, legB: 22, shinB: 42, cape: 14, root: [0, -2, 2] } },
      { t: 0.17, b: { armF: -110, foreF: -10, weapon: 180, armB: 50, foreB: 20, torso: 22, head: 8, legF: -42, shinF: 12, legB: 42, shinB: 24, cape: -20, hairB: -20, root: [0, 6, 0] }, e: 'linear' },
      { t: 0.42, b: { armF: 6, foreF: 4, weapon: 0, armB: -6, foreB: 4, torso: 0, cape: 4, root: [0, 0, 0] } },
    ] },
  },
};

/* Собрать таблицу клипов класса: общие + свои. */
function clipsFor(id) { return Object.assign({}, CLIPS.humanoid, CLIPS[id] || {}); }
