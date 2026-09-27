/* CONFIG — всё, что настраивает баланс и контент: классы, способности, враги, зоны.
   Новая способность = одна строка в CLASSES, новый враг = запись в ENEMIES + спрайт в sprites.js. */

const VW = 480, VH = 270;          // внутреннее разрешение
const GROUND = 236;                // высота пола (координата «ног»)

const TUNING = {
  typing: { slowCps: 2.0, fastCps: 7.0, minMult: 0.5, maxMult: 2.0 },
  tierMult: [1, 1.6, 2.4],         // множитель за завершённый сегмент слова
  levelDamageBonus: 0.06,
  focusBonus: 0.08,                // самурай: +8% урона за единицу Фокуса
  xpForLevel: lvl => Math.round(60 * Math.pow(lvl, 1.5)),
  zoneScale: zi => ({ hp: 1 + 0.35 * zi, attack: 1 + 0.22 * zi }),
  respawnSec: 30,
  /* jump 400 при g 900 даёт высоту ~89 px: с пола (236) достижимы платформы на y ≥ 150.
     Рывок доступен сразу; longDashTime открывает второй босс — без него не перелететь провал перед ареной. */
  physics: { run: 120, jump: 400, gravity: 900, maxFall: 420, dash: 420, dashTime: 0.18, longDashTime: 0.32, dashCd: 0.5, coyote: 0.09 },
  blendWidth: 320,                 // ширина зоны плавного перехода между биомами (px мира)
};

/* Способность: { id, name, trigger, suffixes[], cost, baseDamage, kind, fx, effect?, desc? }
   kind: ranged | melee | heal | guard | focus. Первая буква слова выбирает способность,
   поэтому внутри класса все слова начинаются с разных букв. */
const CLASSES = {
  mage: {
    id: 'mage', name: 'Магичка', tipLen: 26, tagline: 'Рогатая ведьма с посохом: длинные заклинания, огромный урон и самый опасный провал.',
    hp: 80, resource: { name: 'Мана', short: 'MP', max: 60, regen: 4.5, color: '#5aa9ff' },
    miscast: { type: 'explode', max: 0.4, exp: 1.6, title: 'Взрыв посоха',
      desc: 'Ошибка в заклинании — посох взрывается в руках. Урон себе растёт с тем, как далеко вы продвинулись в слове.' },
    abilities: [
      { id: 'zap',      name: 'Искра',        trigger: 'zap',      suffixes: [],                     cost: 0,  baseDamage: 7,  kind: 'ranged', fx: 'spark' },
      { id: 'fireball', name: 'Огненный шар', trigger: 'fireball', suffixes: ['ignis', 'nova'],      cost: 14, baseDamage: 24, kind: 'ranged', fx: 'fire', effect: { burn: 4 }, desc: 'поджигает на 3 с' },
      { id: 'icespike', name: 'Ледяной шип',  trigger: 'icespike', suffixes: ['glacies', 'aeterna'], cost: 12, baseDamage: 16, kind: 'ranged', fx: 'ice', effect: { freeze: 1.6 }, desc: 'откладывает атаку врага' },
      { id: 'mend',     name: 'Исцеление',    trigger: 'mend',     suffixes: ['vitae', 'lux'],       cost: 16, baseDamage: 18, kind: 'heal',   fx: 'heal', desc: 'лечит' },
    ],
  },
  warrior: {
    id: 'warrior', name: 'Берсерк', tipLen: 36, tagline: 'Красный капюшон и меч выше роста: короткие слова, много здоровья. Ошибка открывает вас для контратаки.',
    hp: 130, resource: { name: 'Ярость', short: 'RG', max: 50, regen: 6, color: '#ff7a5a' },
    miscast: { type: 'stagger', max: 1, exp: 1.4, title: 'Потеря равновесия',
      desc: 'Сорванный замах выводит из равновесия: берсерк оглушён, а враг тут же контратакует. Чем дальше в слове — тем дольше оглушение и больнее контратака.' },
    abilities: [
      { id: 'hit',    name: 'Удар',       trigger: 'hit',    suffixes: [],                cost: 0,  baseDamage: 9,  kind: 'melee', fx: 'slash' },
      { id: 'slash',  name: 'Рассечение', trigger: 'slash',  suffixes: ['rend', 'ruin'],  cost: 10, baseDamage: 20, kind: 'melee', fx: 'slash' },
      { id: 'cleave', name: 'Раскол',     trigger: 'cleave', suffixes: ['crush', 'doom'], cost: 16, baseDamage: 30, kind: 'melee', fx: 'cleave' },
      { id: 'guard',  name: 'Стойка',     trigger: 'guard',  suffixes: ['wall', 'iron'],  cost: 8,  baseDamage: 0,  kind: 'guard', fx: 'guard', desc: 'ослабляет следующий удар врага' },
    ],
  },
  samurai: {
    id: 'samurai', name: 'Самурай', tipLen: 22, tagline: 'Ритм и концентрация: каждый чистый приём копит Фокус и усиливает следующие. Ошибка обнуляет всё.',
    hp: 95, resource: { name: 'Ки', short: 'KI', max: 40, regen: 5, color: '#f0b45a' },
    miscast: { type: 'bleed', max: 0.3, exp: 1.5, title: 'Сорванное ката',
      desc: 'Клинок уходит в сторону и ранит самого самурая: кровотечение на 4 секунды и полная потеря Фокуса.' },
    abilities: [
      { id: 'cut',    name: 'Порез', trigger: 'cut',    suffixes: [],               cost: 0,  baseDamage: 8,  kind: 'melee', fx: 'slash' },
      { id: 'iaido',  name: 'Иайдо', trigger: 'iaido',  suffixes: ['kiri', 'zan'],   cost: 12, baseDamage: 22, kind: 'melee', fx: 'iaido' },
      { id: 'flurry', name: 'Шквал', trigger: 'flurry', suffixes: ['rush', 'storm'], cost: 15, baseDamage: 26, kind: 'melee', fx: 'flurry' },
      { id: 'zen',    name: 'Дзен',  trigger: 'zen',    suffixes: ['mind', 'void'],  cost: 0,  baseDamage: 0,  kind: 'focus', fx: 'heal', desc: '+2 Фокуса, восстанавливает Ки' },
    ],
  },
};

/* Враг: interval — секунд между атаками; riposte — шанс ускорить атаку после каста игрока;
   float — парит над землёй; scale — масштаб спрайта; unlock — что открывает победа над боссом. */
/* skin — скин из art-*.js; h/w — высота и ширина тела для позиционирования и эффектов. Боссы вдвое выше героя (48). */
const ENEMIES = {
  ghost:   { id: 'ghost',   name: 'Призрак',          skin: 'ghost',      h: 48,  w: 22, hp: 40,  attack: 7,  interval: 3.2, xp: 26,  riposte: 0,    float: true },
  wisp:    { id: 'wisp',    name: 'Блуждающий огонь', skin: 'wisp',       h: 42,  w: 22, hp: 30,  attack: 9,  interval: 2.4, xp: 30,  riposte: 0.2,  float: true },
  shade:   { id: 'shade',   name: 'Тень',             skin: 'shade',      h: 48,  w: 14, hp: 70,  attack: 11, interval: 2.8, xp: 48,  riposte: 0.3,  float: false },
  knight:  { id: 'knight',  name: 'Рыцарь Пустоты',   skin: 'voidknight', h: 96,  w: 40, hp: 260, attack: 18, interval: 3.0, xp: 240, riposte: 0.25, boss: true, unlock: 'doubleJump', unlockName: 'двойной прыжок' },
  warden:  { id: 'warden',  name: 'Страж Фонаря',     skin: 'warden',     h: 96,  w: 40, hp: 400, attack: 22, interval: 2.6, xp: 380, riposte: 0.35, boss: true, unlock: 'longDash', unlockName: 'долгий рывок' },
  oni:     { id: 'oni',     name: 'Они',              skin: 'oni',        h: 112, w: 64, hp: 650, attack: 30, interval: 3.4, xp: 900, riposte: 0.3,  boss: true, final: true },
};

/* Зоны идут слева направо. plats: [x, y, w] относительно начала зоны; enemies: [тип, x, индекс платформы или -1];
   boss: [тип, x] — босс стоит перед воротами в конце зоны; ledge — уступ, требующий двойного прыжка;
   pit — провал [от, до], который нужно перелететь рывком. */
/* Платформы стоят «лесенкой»: высоты 200/172/148 достижимы с пола, 120 — с соседней платформы. */
const ZONES = [
  { id: 'forest', name: 'Изумрудный лес', w: 1200, bonfire: 70,
    plats: [[200, 200, 72], [330, 172, 60], [450, 148, 60], [560, 120, 56], [700, 200, 88], [860, 160, 64], [1000, 200, 80]],
    enemies: [['ghost', 360, 1], ['shade', 640, -1], ['wisp', 890, 5], ['shade', 1100, -1]] },
  { id: 'cave', name: 'Гулкая пещера', w: 1200,
    plats: [[160, 196, 70], [300, 168, 60], [430, 140, 56], [560, 196, 90], [720, 170, 60], [860, 200, 70], [980, 160, 60]],
    enemies: [['shade', 300, -1], ['wisp', 600, 3], ['ghost', 760, -1], ['shade', 930, -1]],
    boss: ['knight', 1080] },
  { id: 'crystal', name: 'Кристальный грот', w: 1200, bonfire: 120, ledge: true,
    plats: [[260, 196, 70], [400, 168, 60], [520, 140, 60], [640, 196, 80], [800, 168, 70], [940, 200, 90]],
    enemies: [['wisp', 360, -1], ['ghost', 560, -1], ['shade', 700, -1], ['wisp', 980, 5], ['shade', 1080, -1]] },
  { id: 'deadwood', name: 'Мёртвый лес', w: 1200,
    plats: [[180, 196, 70], [320, 168, 60], [440, 140, 64], [560, 196, 80], [720, 160, 64], [880, 200, 80]],
    enemies: [['shade', 260, -1], ['ghost', 480, -1], ['shade', 640, -1], ['wisp', 820, -1], ['ghost', 960, -1]],
    boss: ['warden', 1080] },
  { id: 'sakura', name: 'Сад тишины', w: 960, bonfire: 470, safe: true,
    plats: [[200, 196, 80], [360, 168, 60], [700, 196, 80]], enemies: [] },
  { id: 'arena', name: 'Алый предел', w: 1200, pit: [0, 300],
    plats: [[380, 196, 60], [520, 168, 60], [660, 140, 56], [780, 196, 70]],
    enemies: [['shade', 500, -1], ['ghost', 720, -1]],
    boss: ['oni', 1060] },
];
