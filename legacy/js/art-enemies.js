/* Art: обычные враги в рост героя (~44 px). Призрак и огонь — свои скелеты, тень — гуманоид. */

/* Скелеты для негуманоидов. */
const SKELS = {
  ghost: {
    order: ['root', 'body', 'tail', 'armB', 'armF', 'head'],
    bones: { root: { p: null, x: 0, y: 0 }, body: { p: 'root', x: 0, y: 0 }, head: { p: 'body', x: 0, y: -28 }, tail: { p: 'body', x: 0, y: -3 },
             armB: { p: 'body', x: -8, y: -22 }, armF: { p: 'body', x: 8, y: -22 } },
  },
  wisp: { order: ['root', 'body'], bones: { root: { p: null, x: 0, y: 0 }, body: { p: 'root', x: 0, y: 0 } } },
  oni: {
    order: ['root', 'body', 'armB', 'armF', 'head'],
    bones: { root: { p: null, x: 0, y: 0 }, body: { p: 'root', x: 0, y: 0 }, head: { p: 'body', x: 4, y: -66 },
             armB: { p: 'body', x: -26, y: -58 }, armF: { p: 'body', x: 26, y: -58 } },
  },
};

/* ---------------- Призрак: белый капюшон, тёмный провал лица, чёрные когтистые руки, рваный подол ---------------- */
SKINS.ghost = {
  id: 'ghost', skel: 'ghost',
  pal: { k: '#101018', w: '#f2f3f8', W: '#cfd2e0', x: '#a9adc2', d: '#1a1a26', e: '#b8f0ff', c: '#22222e', C: '#3a3a4a' },
  parts: {
    tail: { bone: 'tail', z: 2, pivot: [11, 0], fps: 5, frames: [
      [ 'kwwwwwwwwwwwwwwwwwwwwwk', 'kwwwwWwwwwwwwwwWwwwwwwk', 'kwwwwWWwwwwwwwWWwwwwwwk', '.kwwwWWwwwwwwwWWwwwwwk.', '.kwwWWxwwwwwwwWWxwwwwk.',
        '.kwwWWx.kwwwwk.WxwwwWk.', '..kWWx..kwwwk..kxwwWk..', '..kWx...kwwwk...kxwWk..', '..kx....kwwk.....kxWk..', '..k.....kwwk......kk...',
        '........kwk............', '........kk.............' ],
      [ 'kwwwwwwwwwwwwwwwwwwwwwk', 'kwwwwWwwwwwwwwwWwwwwwwk', 'kwwwwWWwwwwwwwWWwwwwwwk', '.kwwwWWwwwwwwwWWwwwwwk.', '.kwwWWxwwwwwwwWWxwwwwk.',
        '.kwWWx..kwwwwk..xwwwWk.', '.kWWx...kwwwk...kxwwWk.', '.kWx....kwwwk....kxWWk.', '.kx.....kwwk......kxWk.', '.k......kwwk.......kk..',
        '........kwwk...........', '........kwk............', '........kk.............' ] ] },
    body: { bone: 'body', z: 1, pivot: [10, 29], rows: [
      '.......kkkkkk.......', '.....kkwwwwwwkk.....', '....kwwwwwwwwwwk....', '...kwwwwwwwwwwwwk...', '..kwwwwwwwwwwwwwwk..', '..kwwwwwwwwwwwwwwk..',
      '.kwwwwwwwwwwwwwwwwk.', '.kwwwwwwwwwwwwwwWWk.', '.kwwwwwwwwwwwwwwWWk.', 'kwwwwwwwwwwwwwwwWWxk', 'kwwwwwwwwwwwwwwwWWxk', 'kwwwwwwwwwwwwwwWWxxk',
      'kwwwwwwwwwwwwwwWWxxk', 'kwwwwwwwwwwwwwWWWxxk', 'kwwwwwwwwwwwwwWWxxxk', 'kwwwwwwwwwwwwWWWxxxk', 'kwwwwwwwwwwwwWWxxxxk', 'kwwwwwwwwwwwWWWxxxxk',
      'kwwwwwwwwwwwWWxxxxxk', 'kwwwwwwwwwwWWWxxxxxk', 'kwwwwwwwwwwWWxxxxxxk', 'kwwwwwwwwwwWWxxxxxxk', 'kwwwwwwwwwWWWxxxxxxk', 'kwwwwwwwwwWWxxxxxxxk',
      'kwwwwwwwwwWWxxxxxxxk', 'kwwwwwwwwWWWxxxxxxxk', 'kwwwwwwwwWWxxxxxxxxk', 'kwwwwwwwwWWxxxxxxxxk', 'kwwwwwwwWWWxxxxxxxxk', 'kkkkkkkkkkkkkkkkkkkk' ] },
    armB: { bone: 'armB', z: 0, pivot: [3, 0], rows: ['.kkkk.', 'kccccK', 'kccCck', 'kccCck', 'kccCck', 'kccCck', 'kccCck', 'kccccck', 'kcccccck', 'kkckckck', '.k.k.k.k'] },
    head: { bone: 'head', z: 3, pivot: [9, 17], rows: [
      '.......kkkkk.......', '.....kkwwwwwkk.....', '....kwwwwwwwwwk....', '...kwwwwwwwwwwwk...', '..kwwwwwwwwwwwwwk..', '..kwwwwwwwwwwwwwk..', '.kwwwwwkkkkkkwwwwk.',
      '.kwwwwkddddddkwwwk.', '.kwwwkddddddddkwwk.', 'kwwwwkddeddddekwwwk', 'kwwwwkddeddddekwwwk', 'kwwwwkddddddddkwwwk', 'kwwwwwkddddddkwwwWk', 'kwwwwwwkkkkkkwwwWWk',
      '.kwwwwwwwwwwwwwwWk.', '.kwwwwwwwwwwwwwWWk.', '..kwwwwwwwwwwwWWk..', '...kkkkkkkkkkkkkk..' ] },
    armF: { bone: 'armF', z: 4, pivot: [3, 0], rows: ['.kkkk.', 'kccccK', 'kccCck', 'kccCck', 'kccCck', 'kccCck', 'kccCck', 'kccccck', 'kcccccck', 'kkckckck', '.k.k.k.k'] },
  },
};

/* ---------------- Блуждающий огонь: зелёное пламя с тёмным ядром-глазом, 4 кадра ---------------- */
SKINS.wisp = {
  id: 'wisp', skel: 'wisp', drawScale: 1.6,
  pal: { g: '#2fbf5a', G: '#8affae', l: '#d8ffe4', k: '#0b1a10', d: '#166b33' },
  parts: {
    body: { bone: 'body', z: 0, pivot: [9, 27], fps: 8, frames: [
      [ '........g.........', '.......gg....g....', '......ggg...gg....', '......gGg..gg.....', '.....gGGgg.g......', '.....gGGGgg.......', '....ggGGGGg.......', '....gGGlGGgg......',
        '...ggGGllGGg......', '...gGGGllGGgg.....', '..ggGGGllGGGg.....', '..gGGGlllGGGg.....', '..gGGGkkkGGGgg....', '.ggGGGkkkkGGGg....', '.gGGGGkkkkGGGg....', '.gGGGGGkkGGGGg....',
        '.gGGGGGGGGGGGg....', '.ggGGGGGGGGGgg....', '..gGGGGGGGGGg.....', '..ggGGGGGGGgg.....', '...ggGGGGGgg......', '....ggGGGgg.......', '.....dgggdd.......', '......ddd.........',
        '.......d..........', '..................', '..................' ],
      [ '..................', '.....g............', '....gg......g.....', '....ggg....gg.....', '.....gGg..gg......', '.....gGGg.g.......', '....ggGGgg........', '....gGGGGGg.......',
        '...ggGGlGGgg......', '...gGGGllGGg......', '..ggGGGllGGGg.....', '..gGGGlllGGGg.....', '..gGGGkkkGGGgg....', '.ggGGGkkkkGGGg....', '.gGGGGkkkkGGGg....', '.gGGGGGkkGGGGg....',
        '.gGGGGGGGGGGGg....', '.ggGGGGGGGGGgg....', '..gGGGGGGGGGg.....', '..ggGGGGGGGgg.....', '...ggGGGGGgg......', '....ggGGGgg.......', '.....dgggdd.......', '......ddd.........',
        '.......d..........', '..................', '..................' ],
      [ '..........g.......', '.........gg.......', '........ggg..g....', '........gGg.gg....', '.......gGGggg.....', '......ggGGGg......', '.....ggGGGGg......', '....ggGGlGGgg.....',
        '...ggGGGllGGg.....', '...gGGGGllGGgg....', '..ggGGGGllGGGg....', '..gGGGGlllGGGg....', '..gGGGkkkkGGGg....', '.ggGGGkkkkGGGgg...', '.gGGGGkkkkGGGGg...', '.gGGGGGkkGGGGGg...',
        '.gGGGGGGGGGGGGg...', '.ggGGGGGGGGGGgg...', '..gGGGGGGGGGGg....', '..ggGGGGGGGGgg....', '...ggGGGGGGgg.....', '....ggGGGGgg......', '.....dggggdd......', '......dddd........',
        '.......dd.........', '..................', '..................' ],
      [ '..................', '..................', '......g...........', '.....gg....g......', '.....gGg..gg......', '....ggGGggg.......', '....gGGGGg........', '....gGGlGGg.......',
        '...ggGGllGGg......', '...gGGGllGGgg.....', '..ggGGGllGGGg.....', '..gGGGlllGGGg.....', '..gGGGkkkGGGgg....', '.ggGGGkkkkGGGg....', '.gGGGGkkkkGGGg....', '.gGGGGGkkGGGGg....',
        '.gGGGGGGGGGGGg....', '.ggGGGGGGGGGgg....', '..gGGGGGGGGGg.....', '..ggGGGGGGGgg.....', '...ggGGGGGgg......', '....ggGGGgg.......', '.....dgggdd.......', '......ddd.........',
        '.......d..........', '..................', '..................' ] ] },
  },
};

/* ---------------- Тень: дымный гуманоид с одним алым глазом, рваные края ---------------- */
SKINS.shade = {
  id: 'shade',
  pal: { k: '#0b0b12', d: '#1e1a2c', D: '#2c2740', L: '#3a3452', r: '#ff3b4a', R: '#ff8a90' },
  parts: {
    armB:  { bone: 'armB', z: 2, pivot: [2, 0], rows: ['.kkk.', 'kdddk', 'kdDdk', 'kdDdk', 'kdddk', 'kdddk', 'kddkk', 'kdddk', '.kkk.'] },
    foreB: { bone: 'foreB', z: 3, pivot: [2, 0], rows: ['.kkk.', 'kdDdk', 'kdDdk', 'kdddk', 'kdddk', 'kdddk', 'kkdkk', 'kdddk', 'kkkkk', 'k.k.k'] },
    legB:  { bone: 'legB', z: 4, pivot: [2, 0], rows: ['.kkkk.', 'kdDddk', 'kdDddk', 'kdDddk', 'kddddk', 'kddddk', 'kddddk', 'kdddkk', 'kddddk', '.kkkk.', '..kk..'] },
    shinB: { bone: 'shinB', z: 5, pivot: [2, 0], rows: ['.kkkk.', 'kdDddk', 'kdDddk', 'kddddk', 'kddddk', 'kddddk', 'kddkdk', 'kddddk', 'kdkddk', 'kddddk', '.kddk.', '.kkkk.', '..k...'] },
    torso: { bone: 'torso', z: 6, pivot: [5, 11], rows: [
      '...kkkkkk...', '..kddddddk..', '.kddDdddddk.', '.kddDddddDk.', 'kdddDDdddDDk', 'kdddddddddDk', 'kddddddddDDk', 'kdddddddDDDk',
      'kkdddddddDkk', '.kdddddddDk.', '.kkdddddkkk.', '.kdddddddDk.', 'kkdddkddddDk', 'kdddddddkddk', 'kdkddkkkdddk', 'kk.kk...kkkk' ] },
    head:  { bone: 'head', z: 7, pivot: [6, 14], rows: [
      '....kkkkkk....', '...kddddddk...', '..kdDDdddddk..', '.kddDdddddddk.', '.kddDdddddddk.', 'kdddddddddddkk', 'kddddddkkkkddk',
      'kddddddkrRRkdk', 'kddddddkRrrkdk', '.kddddddkkkddk', '.kddddddddddk.', '..kdddddddddk.', '...kkddkkkkk..', '.....kddk.....', '.....kkkk.....' ] },
    legF:  { bone: 'legF', z: 8, pivot: [2, 0], rows: ['.kkkk.', 'kdDddk', 'kdDddk', 'kdDddk', 'kddddk', 'kddddk', 'kddddk', 'kdddkk', 'kddddk', '.kkkk.', '..kk..'] },
    shinF: { bone: 'shinF', z: 9, pivot: [2, 0], rows: ['.kkkk.', 'kdDddk', 'kdDddk', 'kddddk', 'kddddk', 'kddddk', 'kddkdk', 'kddddk', 'kdkddk', 'kddddk', '.kddk.', '.kkkk.', '..k...'] },
    armF:  { bone: 'armF', z: 10, pivot: [2, 0], rows: ['.kkk.', 'kdddk', 'kdDdk', 'kdDdk', 'kdddk', 'kdddk', 'kddkk', 'kdddk', '.kkk.'] },
    foreF: { bone: 'foreF', z: 12, pivot: [2, 0], rows: ['.kkk.', 'kdDdk', 'kdDdk', 'kdddk', 'kdddk', 'kdddk', 'kkdkk', 'kdddk', 'kkkkk', 'k.k.k'] },
  },
};

/* Клипы негуманоидов. */
CLIPS.ghost = {
  idle: { len: 2.4, loop: true, keys: [
    { t: 0,   b: { root: [0, 0, 0], body: 0, head: 0, armB: 20, armF: -20, tail: 0 } },
    { t: 1.2, b: { root: [0, 0, -6], body: 3, head: -3, armB: 32, armF: -34, tail: -4 } },
  ] },
  run: { len: 2.4, loop: true, keys: [
    { t: 0,   b: { root: [0, 0, 0], body: 4, head: 0, armB: 30, armF: -40, tail: 10 } },
    { t: 1.2, b: { root: [0, 0, -6], body: 8, head: -3, armB: 40, armF: -50, tail: 16 } },
  ] },
  melee: { len: 0.5, loop: false, keys: [
    { t: 0,    b: { armF: -160, armB: 150, body: -10, head: -8, root: [0, -3, -4] } },
    { t: 0.14, b: { armF: -170, armB: 160, body: -14, head: -10, root: [0, -4, -6] } },
    { t: 0.22, b: { armF: -30, armB: 30, body: 20, head: 12, root: [0, 6, 0] }, e: 'linear' },
    { t: 0.5,  b: { armF: -20, armB: 20, body: 0, head: 0, root: [0, 0, 0] } },
  ] },
  hurt: { len: 0.3, loop: false, keys: [ { t: 0, b: { body: -16, head: -12, armF: -80, armB: 80, root: [0, -3, 0] } }, { t: 0.3, b: { armB: 20, armF: -20 } } ] },
};
CLIPS.wisp = {
  idle: { len: 1.6, loop: true, keys: [ { t: 0, b: { root: [0, 0, 0], body: -4 } }, { t: 0.8, b: { root: [0, 0, -5], body: 4 } } ] },
  run: { len: 1.6, loop: true, keys: [ { t: 0, b: { root: [0, 0, 0], body: -8 } }, { t: 0.8, b: { root: [0, 0, -5], body: 8 } } ] },
  melee: { len: 0.5, loop: false, keys: [ { t: 0, b: { body: -20, root: [0, -3, -6] } }, { t: 0.2, b: { body: 30, root: [0, 6, 0] }, e: 'linear' }, { t: 0.5, b: { body: 0 } } ] },
  hurt: { len: 0.3, loop: false, keys: [ { t: 0, b: { body: -25, root: [0, -3, 0] } }, { t: 0.3, b: { body: 0 } } ] },
};
CLIPS.shade = {
  melee: { len: 0.45, loop: false, keys: [
    { t: 0,    b: { armF: -150, foreF: -40, armB: 40, torso: -12, head: -8, legF: 10, legB: -10 } },
    { t: 0.12, b: { armF: -165, foreF: -40, armB: 46, torso: -16, head: -10, legF: 12, legB: -12 } },
    { t: 0.2,  b: { armF: -20, foreF: 30, armB: 30, torso: 24, head: 10, legF: -34, shinF: 20, legB: 30, shinB: 30, root: [0, 5, 0] }, e: 'linear' },
    { t: 0.45, b: { armF: 6, foreF: 4, armB: -6, torso: 0 } },
  ] },
};
