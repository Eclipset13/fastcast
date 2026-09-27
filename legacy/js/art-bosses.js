/* Art: боссы (~96–110 px, вдвое крупнее героя). Рыцарь и Страж — гуманоидный скелет с масштабом 2, Они — свой скелет. */

/* Генераторы крупных форм: строки собираются кодом, чтобы не выписывать сотни одинаковых символов. */
const Gen = {
  row(w, fn) { let s = ''; for (let x = 0; x < w; x++) s += fn(x) || '.'; return s; },
  /* Секира: двойное лезвие-полумесяц сверху, длинное древко. */
  axe() {
    const W = 24, rows = [];
    for (let i = 0; i < 29; i++) {
      const hw = Math.round(10 * Math.sin(Math.PI * i / 28));
      rows.push(this.row(W, x => {
        const inL = x >= 10 - hw && x <= 9, inR = x >= 14 && x <= 13 + hw, haft = x >= 10 && x <= 13 && i > 6;
        if (haft) return x === 10 || x === 13 ? 'k' : 'm';
        if (!inL && !inR) return null;
        const edge = x === 10 - hw || x === 13 + hw || i === 0 || i === 28;
        if (edge) return 'k';
        if (i === 12 || i === 16) return 'c';
        return i < 14 ? 'a' : 'A';
      }));
    }
    for (let i = 29; i < 92; i++) rows.push(this.row(W, x => x === 10 || x === 13 ? 'k' : x === 11 ? (i % 8 === 0 ? 'l' : i > 64 && i < 74 ? 'A' : 'm') : x === 12 ? (i > 64 && i < 74 ? 'A' : 'm') : null));
    return rows;
  },
  /* Коса: длинная рукоять, изогнутое зелёное лезвие уходит влево-вниз от верхушки. */
  scythe() {
    const W = 36, rows = [];
    for (let i = 0; i < 96; i++) {
      rows.push(this.row(W, x => {
        if (x >= 15 && x <= 18 && i >= 4) return x === 15 || x === 18 ? 'k' : (i % 9 === 0 ? 'T' : 't');
        if (i < 34) {
          const t = i / 33, cx = 16 - 22 * Math.sin(t * Math.PI / 2), w = 2 + 7 * Math.sin(Math.PI * Math.min(1, t * 1.2));
          if (x >= cx - w / 2 && x <= cx + w / 2) { const e = x <= cx - w / 2 + 0.6 || x >= cx + w / 2 - 0.6; return e ? 'g' : (x < cx ? 'l' : 'G'); }
        }
        return null;
      }));
    }
    return rows;
  },
  /* Рваный плащ Стража: расширяется книзу, низ изорван. */
  cloak() {
    const rng = mulberry32(77), W = 34, rows = [];
    for (let i = 0; i < 54; i++) {
      const w = Math.round(12 + 22 * Math.min(1, i / 40)), x0 = W - w;
      rows.push(this.row(W, x => {
        if (x < x0) return null;
        if (i > 44 && rng() < (i - 44) / 12) return null;
        if (x === x0 || i === 0) return 'k';
        if (x > W - 4) return 'D';
        if ((x - i) % 9 === 0) return 'L';
        return 'd';
      }));
    }
    return rows;
  },
  /* Они: массивный торс, уходящий в дым. */
  oniBody() {
    const rng = mulberry32(5), W = 64, rows = [];
    for (let i = 0; i < 72; i++) {
      let hw = i < 10 ? 20 + i * 1.1 : i < 50 ? 31 - (i - 10) * 0.12 : 26 - (i - 50) * 0.3;
      rows.push(this.row(W, x => {
        const d = Math.abs(x - 31.5);
        if (d > hw) return null;
        if (i > 56 && rng() < (i - 56) / 18) return null;
        if (d > hw - 1.2) return 'k';
        if (x < 22) return 'D';
        if (x > 40 && i > 12 && i < 40 && (x + i) % 7 === 0) return 'r';
        return 'R';
      }));
    }
    return rows;
  },
  oniHead() {
    const W = 44, rows = [];
    for (let i = 0; i < 46; i++) {
      rows.push(this.row(W, x => {
        // рога: два изогнутых шипа, расходящиеся вверх
        if (i < 18) {
          const t = i / 17, lx = 3 + t * 6, rx = 40 - t * 6, w = 2 + t * 3;
          if ((x >= lx && x <= lx + w) || (x >= rx - w && x <= rx)) return (x < lx + 1 || x > rx - 1) ? 'k' : 'D';
        }
        // лицо: эллипс
        const dx = (x - 22) / 19, dy = (i - 29) / 15, r = dx * dx + dy * dy;
        if (i >= 12 && r <= 1) {
          if (r > 0.86) return 'k';
          if ((x >= 11 && x <= 16 && i >= 22 && i <= 27) || (x >= 28 && x <= 33 && i >= 22 && i <= 27)) return 'w';
          if (i >= 34 && i <= 36 && x >= 14 && x <= 30 && x % 3 === 0) return 'k';
          return x < 16 ? 'D' : 'R';
        }
        if (i >= 41 && x >= 17 && x <= 27) return x === 17 || x === 27 ? 'k' : 'D';
        return null;
      }));
    }
    return rows;
  },
  oniArm() {
    const W = 20, rows = [];
    for (let i = 0; i < 54; i++) {
      rows.push(this.row(W, x => {
        if (i < 46) { const hw = 8 - i * 0.08; const d = Math.abs(x - 9.5); if (d > hw) return null; return d > hw - 1.2 ? 'k' : x < 8 ? 'D' : 'R'; }
        const claws = [3, 9, 15], j = i - 46;
        for (const c of claws) if (Math.abs(x - c) <= 2 - j * 0.25) return j > 6 ? 'k' : 'D';
        return null;
      }));
    }
    return rows;
  },
};

/* ---------------- Рыцарь Пустоты: шипастая тёмная броня, бирюзовое свечение, секира ---------------- */
SKINS.voidknight = {
  id: 'voidknight', scale: 2, rest: { weapon: 180 }, upright: { weapon: 24 },
  pal: { k: '#070a0c', a: '#2f3c3e', A: '#1a2325', l: '#4c5c5f', c: '#4ee8c0', C: '#c8fff4', r: '#5c1f24', R: '#3a1216', m: '#262b2c' },
  parts: {
    armB:  { bone: 'armB', z: 2, pivot: [5, 0], rows: ['k...kk...k..', 'kk.kaak.kk..', 'kaakaaakaak.', 'kaaaaaaaaaak', 'kllaaaaaaaAk', 'kllaaaaaaaAk', 'klaaaaaaaAAk', '.kaaaaaaaAk.', '.kaaaaaaaAk.', '.kaaaaaaaAk.', '.kaaaaaaAAk.', '.kaaaaaaAAk.', '.kAaaaaaAAk.', '.kAaaaaaAAk.', '.kAaaaaAAAk.', '.kAAaaaAAAk.', '.kAAAAAAAAk.', '..kkkkkkkk..'] },
    foreB: { bone: 'foreB', z: 3, pivot: [4, 0], rows: ['.kkkkkkkk.', 'kaaaaaaaAk', 'klaaaaaaAk', 'klaaaaaaAk', 'kaaaaaaaAk', 'kaaaaaaaAk', 'kaaaaaaAAk', 'kaaaaaaAAk', 'kAaaaaaAAk', 'kAaaaaaAAk', 'kAaaaaAAAk', 'kAAaaaAAAk', '.kkkkkkkk.', '.kAAAAAAk.', '.kAaaaAAk.', '.kAaaaAAk.', '.kAAAAAAk.', '.kAAAAAAk.', '..kkkkkk..'] },
    legB:  { bone: 'legB', z: 4, pivot: [5, 0], rows: ['.kkkkkkkkkk.', 'kaaaaaaaaAAk', 'klaaaaaaaAAk', 'klaaaaaaaAAk', 'kaaaaaaaaAAk', 'kaaaaaaaaAAk', 'kaaaaaaaAAAk', 'kaaaaaaaAAAk', 'kaaaaaaaAAAk', 'kAaaaaaaAAAk', 'kAaaaaaaAAAk', 'kAaaaaaAAAAk', 'kAaaaaaAAAAk', 'kAAaaaaAAAAk', 'kAAaaaaAAAAk', 'kAAaaaAAAAAk', 'kAAAaaAAAAAk', 'kAAAAAAAAAAk', '.kAAAAAAAAk.', '.kAAAAAAAAk.', '.kkkkkkkkkk.'] },
    shinB: { bone: 'shinB', z: 5, pivot: [5, 0], rows: ['.kkkkkkkkkk...', 'kaaaaaaaaAAk..', 'klaaaaaaaAAk..', 'klaaaaaaaAAk..', 'kaaaaaaaaAAk..', 'kaaaaaaaaAAk..', 'kaaaaaaaAAAk..', 'kaaaaaaaAAAk..', 'kAaaaaaaAAAk..', 'kAaaaaaaAAAk..', 'kAaaaaaaAAAk..', 'kAaaaaaAAAAk..', 'kAaaaaaAAAAk..', 'kAAaaaaAAAAk..', 'kAAaaaaAAAAk..', 'kAAaaaAAAAAk..', 'kAAAaaAAAAAk..', 'kAAAAAAAAAAk..', 'kAAAAAAAAAAk..', 'kAAAAAAAAAAk..', 'kAAAAAAAAAAkk.', 'kAAAAAAAAAAAAk', 'kAAAAAAAAAAAAk', 'kAAAAAAAAAAAAk', 'kkkkkkkkkkkkkk'] },
    torso: { bone: 'torso', z: 6, pivot: [11, 22], rows: [
      '......kkkkkkkkkkkk......', '....kkaaaaaaaaaaaakk....', '..kkaaaaaaaaaaaaaaaakk..', '.kaallaaaaaaaaaaaaaaaak.', 'kaalllaaaaaaaaaaaaaaaAAk', 'kaallaaaaaakccckaaaaaAAk',
      'kaalaaaaaakcCCCckaaaaAAk', 'kaalaaaaaakcCCCckaaaaAAk', 'kaaaaaaaaaakcccckaaaaAAk', 'kaaaaaaaaaaakkkkaaaaaAAk', 'kaaaaaaaaaaaaaaaaaaaAAAk', 'kAaaaaaaaaaaaaaaaaaaAAAk',
      'kAaaaaaakaaaaaaakaaaAAAk', 'kAaaaaaakaaaaaaakaaaAAAk', 'kAAaaaaaakaaaaaakaaAAAAk', 'kAAaaaaaaakkkkkkaaaAAAAk', 'kAAAaaaaaaaaaaaaaaAAAAAk', '.kAAAaaaaaaaaaaaaAAAAAk.',
      '.kAAAAaaaaaaaaaaAAAAAAk.', '.kAAAAAaaaaaaaaAAAAAAAk.', '..kAAAAAAAAAAAAAAAAAAk..', '..kkkkkkkkkkkkkkkkkkkk..', '..kmmmmmmmmmmmmmmmmmmk..', '..krrrrrrrrRRrrrrrrrrk..',
      '..krrrrrrrrRRrrrrrrrrk..', '..krrrrrrrRRRrrrrrrrrk..', '...krrrrrrRRRrrrrrrrk...', '...krrrrrRRRRrrrrrrrk...', '...kRrrrrRRRRrrrrrRrk...', '....kRrrrRRRrrrrrRk.....', '....kRRrrRRRrrrrRk......', '.....kkkkkkkkkkkk.......' ] },
    head:  { bone: 'head', z: 7, pivot: [12, 27], rows: [
      '............kk............', '...........kaak...........', '..kk.......kaak.......kk..', '..kak......kaak......kak..', '..kaak.....klak.....kaak..', '...kaak....klak....kaak...',
      '...kaakkkkkkllkkkkkkaak...', '....kaaaaaalllaaaaaaak....', '....kaaaaaalllaaaaaaAk....', '...kaaaaaaaaalaaaaaaaAk...', '...kaaaaaaaaaaaaaaaaAAk...', '..kaaaaaaaaaaaaaaaaaaAAk..',
      '..kaaaaaaaaaaakkkkkkkkAk..', '..kaaaaaaaaaakccCcccccAk..', '..kaaaaaaaaaakcCCccccckk..', '..kaaaaaaaaaaakkkkkkkAAk..', '..kAaaaaaaaaaaaaaaaaAAAk..', '..kAaaaaaaaaaaaaaaaaAAAk..',
      '..kAAaaaaaaaaaaaaaaAAAAk..', '...kAAaaaaaaaaaaaaAAAAk...', '...kAAAaaaaaaaaaaAAAAAk...', '....kAAAAaaaaaaaAAAAAk....', '....kAAAAAAAAAAAAAAAAk....', '.....kAAAAAAAAAAAAAAk.....',
      '......kAAAAAAAAAAAAk......', '.......kkkkkkkkkkkk.......', '..........kAAAAk..........', '..........kAAAAk..........' ] },
    legF:  { bone: 'legF', z: 8, pivot: [5, 0], rows: ['.kkkkkkkkkk.', 'kaaaaaaaaAAk', 'klaaaaaaaAAk', 'klaaaaaaaAAk', 'kaaaaaaaaAAk', 'kaaaaaaaaAAk', 'kaaaaaaaAAAk', 'kaaaaaaaAAAk', 'kaaaaaaaAAAk', 'kAaaaaaaAAAk', 'kAaaaaaaAAAk', 'kAaaaaaAAAAk', 'kAaaaaaAAAAk', 'kAAaaaaAAAAk', 'kAAaaaaAAAAk', 'kAAaaaAAAAAk', 'kAAAaaAAAAAk', 'kAAAAAAAAAAk', '.kAAAAAAAAk.', '.kAAAAAAAAk.', '.kkkkkkkkkk.'] },
    shinF: { bone: 'shinF', z: 9, pivot: [5, 0], rows: ['.kkkkkkkkkk...', 'kaaaaaaaaAAk..', 'klaaaaaaaAAk..', 'klaaaaaaaAAk..', 'kaaaaaaaaAAk..', 'kaaaaaaaaAAk..', 'kaaaaaaaAAAk..', 'kaaaaaaaAAAk..', 'kAaaaaaaAAAk..', 'kAaaaaaaAAAk..', 'kAaaaaaaAAAk..', 'kAaaaaaAAAAk..', 'kAaaaaaAAAAk..', 'kAAaaaaAAAAk..', 'kAAaaaaAAAAk..', 'kAAaaaAAAAAk..', 'kAAAaaAAAAAk..', 'kAAAAAAAAAAk..', 'kAAAAAAAAAAk..', 'kAAAAAAAAAAk..', 'kAAAAAAAAAAkk.', 'kAAAAAAAAAAAAk', 'kAAAAAAAAAAAAk', 'kAAAAAAAAAAAAk', 'kkkkkkkkkkkkkk'] },
    armF:  { bone: 'armF', z: 10, pivot: [5, 0], rows: ['k...kk...k..', 'kk.kaak.kk..', 'kaakaaakaak.', 'kaaaaaaaaaak', 'kllaaaaaaaAk', 'kllaaaaaaaAk', 'klaaaaaaaAAk', '.kaaaaaaaAk.', '.kaaaaaaaAk.', '.kaaaaaaaAk.', '.kaaaaaaAAk.', '.kaaaaaaAAk.', '.kAaaaaaAAk.', '.kAaaaaaAAk.', '.kAaaaaAAAk.', '.kAAaaaAAAk.', '.kAAAAAAAAk.', '..kkkkkkkk..'] },
    weapon:{ bone: 'weapon', z: 11, pivot: [11, 68], rows: Gen.axe() },
    foreF: { bone: 'foreF', z: 12, pivot: [4, 0], rows: ['.kkkkkkkk.', 'kaaaaaaaAk', 'klaaaaaaAk', 'klaaaaaaAk', 'kaaaaaaaAk', 'kaaaaaaaAk', 'kaaaaaaAAk', 'kaaaaaaAAk', 'kAaaaaaAAk', 'kAaaaaaAAk', 'kAaaaaAAAk', 'kAAaaaAAAk', '.kkkkkkkk.', '.kAAAAAAk.', '.kAaaaAAk.', '.kAaaaAAk.', '.kAAAAAAk.', '.kAAAAAAk.', '..kkkkkk..'] },
  },
};

/* ---------------- Страж Фонаря: пылающий зелёный череп, рваный плащ, коса и фонарь ---------------- */
SKINS.warden = {
  id: 'warden', scale: 2, rest: { weapon: 180, weaponB: 0 }, upright: { weapon: 14, weaponB: 0 },
  pal: { k: '#08090c', d: '#1f1a26', D: '#2d2434', L: '#3b3044', m: '#4d2c32', M: '#6a3a42', g: '#3fd66a', G: '#a6ffbe', l: '#eafff0', t: '#3d4232', T: '#5a6048', c: '#8f8a72' },
  parts: {
    cape:  { bone: 'cape', z: 0, pivot: [30, 0], rows: Gen.cloak() },
    armB:  { bone: 'armB', z: 2, pivot: [5, 0], rows: ['.kkkkkkkkkk.', 'kddddddddddk', 'kDddddddddDk', 'kDddddddddDk', 'kdddddddddDk', 'kdddddddddDk', 'kdddddddddDk', '.kddddddddk.', '.kddddddddk.', '.kddddddddk.', '.kddddddddk.', '.kdddddddDk.', '.kdddddddDk.', '.kdddddddDk.', '..kdddddDk..', '..kdddddDk..', '..kddddddk..', '...kkkkkk...'] },
    foreB: { bone: 'foreB', z: 3, pivot: [4, 0], rows: ['.kkkkkkkk.', 'kddddddddk', 'kDdddddddk', 'kDdddddddk', 'kddddddddk', 'kddddddddk', 'kdddddddDk', 'kdddddddDk', 'kdddddddDk', 'kdddddddDk', '.kdddddDk.', '.kdddddDk.', '.kkkkkkkk.', '.kgGGGGgk.', 'kgGGGGGGgk', 'kgGGlGGGgk', 'kgGGGGGGgk', '.kgGGGGgk.', '.kgkgkgkk.', '..g.g.g...', '..g.g.g...'] },
    weaponB:{ bone: 'weaponB', z: 4, pivot: [8, 0], fps: 6, frames: [
      [ '........c.........', '........c.........', '.......cc.........', '........c.........', '.......cc.........', '........c.........', '......kkkkk.......', '.....kttttk.......', '....ktkkkkktk.....',
        '...ktk.....ktk....', '...kt..gGg..tk....', '...kt.gGGGg.tk....', '...kt.gGlGg.tk....', '...kt.gGGGg.tk....', '...kt..gGg..tk....', '...kt...g...tk....', '...ktk.....ktk....', '....ktkkkkktk.....',
        '.....kttttk.......', '......kkkkk.......', '........k.........', '........k.........', '.......kkk........' ],
      [ '........c.........', '.......cc.........', '........c.........', '........c.........', '.......cc.........', '........c.........', '......kkkkk.......', '.....kttttk.......', '....ktkkkkktk.....',
        '...ktk.....ktk....', '...kt...g...tk....', '...kt..gGg..tk....', '...kt.gGGGg.tk....', '...kt.gGlGg.tk....', '...kt.gGGGg.tk....', '...kt..gGg..tk....', '...ktk.....ktk....', '....ktkkkkktk.....',
        '.....kttttk.......', '......kkkkk.......', '........k.........', '........k.........', '.......kkk........' ] ] },
    legB:  { bone: 'legB', z: 4, pivot: [4, 0], rows: ['.kkkkkkkk.', 'kddddddddk', 'kDdddddddk', 'kddddddddk', 'kddddddddk', 'kdddddddDk', 'kdddddddDk', 'kdddddddDk', 'kdddddddDk', 'kdddddddDk', 'kdddddddDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', '.kkkkkkkk.'] },
    shinB: { bone: 'shinB', z: 5, pivot: [4, 0], rows: ['.kkkkkkkk.', 'kddddddddk', 'kDdddddddk', 'kddddddddk', 'kddddddddk', 'kdddddddDk', 'kdddddddDk', 'kdddddddDk', 'kdddddddDk', 'kdddddddDk', 'kdddddddDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', 'kkkkkkkkkk', 'kgggggggggk', 'kkkkkkkkkkk'] },
    torso: { bone: 'torso', z: 6, pivot: [12, 24], rows: [
      '.......kkkkkkkkkkkk.......', '.....kkddddddddddddkk.....', '...kkdddddddddddddddddkk..', '..kddddddddmmmmddddddddDk.', '.kdddddddddmMMmmdddddddDDk', 'kddddddddddmMMmmddddddDDDk',
      'kdddddddddmmMMmmmdddddDDDk', 'kdddddddddmmMMMmmdddddDDDk', 'kDddddddddmmmMmmmdddddDDDk', 'kDdddddddddmmmmmddddddDDDk', 'kDddddddddddmmmdddddddDDDk', 'kDdddddddddddgdddddddDDDDk',
      'kDddddddddddgggddddddDDDDk', 'kDdddddddddddgdddddddDDDDk', 'kDDdddddddddddddddddDDDDDk', 'kDDdddddddddddddddddDDDDDk', '.kDDddddddddddddddddDDDDk.', '.kDDddddddddddddddddDDDDk.',
      '.kDDDdddddddddddddddDDDDk.', '.kDDDdddddddddddddddDDDDk.', '..kDDDddddddddddddddDDDk..', '..kDDDDddddddddddddDDDDk..', '..kcccccccccccccccccccck..', '..kDDDDDDDDDDDDDDDDDDDDk..',
      '..kddddddddddddddddddddk..', '..kddddddddddddddddddddk..', '..kdDdddddddddddddddDddk..', '..kdDdddddddddddddddDddk..', '..kdDddddddddddddddDDddk..', '...kDddddddddddddddDdk....',
      '...kDddddddddddddddDdk....', '...kkddkkddddddkkddkk.....', '....kkk..kddddk..kk.......', '..........kkkk............' ] },
    head:  { bone: 'head', z: 7, pivot: [11, 29], fps: 7, frames: [
      [ '..........g...g.........', '.........gg..gg...g.....', '.....g...ggg.gg..gg.....', '.....gg..ggggggg.gg.....', '......gg.gGGGGgggg......', '.......gggGGGGGgg.......', '......ggGGGGGGGGgg......',
        '.....ggGGGGGGGGGGgg.....', '.....gGGGGGGGGGGGGg.....', '....kGGGGGGGGGGGGGGk....', '...kGGGGGGGGGGGGGGGGk...', '..kGGGGGGGGGGGGGGGGGGk..', '..kGGGGkkkkGGGGkkkkGGk..', '..kGGGkddddkGGkddddkGk..',
        '..kGGGkdlddkGGkdlddkGk..', '..kGGGkddddkGGkddddkGk..', '..kGGGGkkkkGGGGkkkkGGk..', '..kGGGGGGGGGGGGGGGGGGk..', '...kGGGGGGGkkGGGGGGGk...', '...kGGGkkkkddkkkkGGGk...', '....kGGkdkdkkdkdkGGk....',
        '....kGGkkkkkkkkkkGGk....', '.....kGGGGGGGGGGGGk.....', '......kGGGGGGGGGGk......', '.......kkkkkkkkkk.......', '.........kdddddk........', '.........kdddddk........', '.........kDdddDk........', '.........kdddddk........', '..........kkkkk.........' ],
      [ '.......g......g.........', '....g..gg....gg.........', '....gg.ggg..ggg..g......', '.....gg.gggggggg.gg.....', '......ggggGGGGggggg.....', '.......ggGGGGGGggg......', '......ggGGGGGGGGgg......',
        '.....ggGGGGGGGGGGgg.....', '.....gGGGGGGGGGGGGg.....', '....kGGGGGGGGGGGGGGk....', '...kGGGGGGGGGGGGGGGGk...', '..kGGGGGGGGGGGGGGGGGGk..', '..kGGGGkkkkGGGGkkkkGGk..', '..kGGGkddddkGGkddddkGk..',
        '..kGGGkdlddkGGkdlddkGk..', '..kGGGkddddkGGkddddkGk..', '..kGGGGkkkkGGGGkkkkGGk..', '..kGGGGGGGGGGGGGGGGGGk..', '...kGGGGGGGkkGGGGGGGk...', '...kGGGkkkkddkkkkGGGk...', '....kGGkdkdkkdkdkGGk....',
        '....kGGkkkkkkkkkkGGk....', '.....kGGGGGGGGGGGGk.....', '......kGGGGGGGGGGk......', '.......kkkkkkkkkk.......', '.........kdddddk........', '.........kdddddk........', '.........kDdddDk........', '.........kdddddk........', '..........kkkkk.........' ] ] },
    legF:  { bone: 'legF', z: 8, pivot: [4, 0], rows: ['.kkkkkkkk.', 'kddddddddk', 'kDdddddddk', 'kddddddddk', 'kddddddddk', 'kdddddddDk', 'kdddddddDk', 'kdddddddDk', 'kdddddddDk', 'kdddddddDk', 'kdddddddDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', '.kkkkkkkk.'] },
    shinF: { bone: 'shinF', z: 9, pivot: [4, 0], rows: ['.kkkkkkkk.', 'kddddddddk', 'kDdddddddk', 'kddddddddk', 'kddddddddk', 'kdddddddDk', 'kdddddddDk', 'kdddddddDk', 'kdddddddDk', 'kdddddddDk', 'kdddddddDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', 'kddddddDDk', 'kkkkkkkkkk', 'kgggggggggk', 'kkkkkkkkkkk'] },
    armF:  { bone: 'armF', z: 10, pivot: [5, 0], rows: ['.kkkkkkkkkk.', 'kddddddddddk', 'kDddddddddDk', 'kDddddddddDk', 'kdddddddddDk', 'kdddddddddDk', 'kdddddddddDk', '.kddddddddk.', '.kddddddddk.', '.kddddddddk.', '.kddddddddk.', '.kdddddddDk.', '.kdddddddDk.', '.kdddddddDk.', '..kdddddDk..', '..kdddddDk..', '..kddddddk..', '...kkkkkk...'] },
    weapon:{ bone: 'weapon', z: 11, pivot: [16, 70], rows: Gen.scythe() },
    foreF: { bone: 'foreF', z: 12, pivot: [4, 0], rows: ['.kkkkkkkk.', 'kddddddddk', 'kDdddddddk', 'kDdddddddk', 'kddddddddk', 'kddddddddk', 'kdddddddDk', 'kdddddddDk', 'kdddddddDk', 'kdddddddDk', '.kdddddDk.', '.kdddddDk.', '.kkkkkkkk.', '.kgGGGGgk.', 'kgGGGGGGgk', 'kgGGlGGGgk', 'kgGGGGGGgk', '.kgGGGGgk.', '.kgkgkgkk.', '..g.g.g...', '..g.g.g...'] },
  },
};

/* ---------------- Они: исполинский алый силуэт с рогами и белыми глазами, тело уходит в дым ---------------- */
SKINS.oni = {
  id: 'oni', skel: 'oni',
  pal: { R: '#8a1f2e', r: '#a83040', D: '#5e1220', k: '#36080f', w: '#fff4d0' },
  parts: {
    armB: { bone: 'armB', z: 0, pivot: [9, 2], rows: Gen.oniArm() },
    body: { bone: 'body', z: 1, pivot: [31, 71], rows: Gen.oniBody() },
    head: { bone: 'head', z: 2, pivot: [21, 45], rows: Gen.oniHead() },
    armF: { bone: 'armF', z: 3, pivot: [9, 2], rows: Gen.oniArm() },
  },
};

/* Клипы боссов: гуманоидные боссы используют общие клипы + свои атаки; Они — свои. */
CLIPS.voidknight = {
  melee: { len: 0.9, loop: false, abs: ['weapon'], keys: [
    { t: 0,    b: { armF: 150, foreF: -20, weapon: 180, armB: 100, foreB: -30, torso: -16, head: -10, legF: 10, legB: -10, root: [0, -4, 0] } },
    { t: 0.4,  b: { armF: 168, foreF: -14, weapon: 180, armB: 120, foreB: -30, torso: -22, head: -14, legF: 12, legB: -12, root: [0, -6, 0] } },
    { t: 0.5,  b: { armF: -60, foreF: -20, weapon: 180, armB: -40, foreB: 10, torso: 34, head: 14, legF: -30, shinF: 24, legB: 30, shinB: 34, root: [0, 8, 2] }, e: 'linear' },
    { t: 0.9,  b: { armF: 6, foreF: 4, weapon: 180, armB: -6, torso: 0, root: [0, 0, 0] } },
  ] },
};
CLIPS.warden = {
  idle: { len: 2.4, loop: true, keys: [
    { t: 0,   b: { torso: 2, head: 0, armF: -10, foreF: -30, armB: 20, foreB: -10, weaponB: 6, cape: 6, root: [0, 0, 0] } },
    { t: 1.2, b: { torso: 4, head: -3, armF: -14, foreF: -36, armB: 26, foreB: -14, weaponB: -6, cape: 12, root: [0, 0, -3] } },
  ] },
  melee: { len: 0.9, loop: false, abs: ['weapon'], keys: [
    { t: 0,    b: { armF: 120, foreF: -40, weapon: 190, armB: 40, foreB: -20, torso: -12, head: -8, cape: 10 } },
    { t: 0.4,  b: { armF: 140, foreF: -40, weapon: 196, armB: 50, foreB: -20, torso: -18, head: -12, cape: 16, root: [0, -6, 0] } },
    { t: 0.52, b: { armF: -110, foreF: 0, weapon: 170, armB: -20, foreB: 10, torso: 30, head: 12, cape: -20, legF: -24, shinF: 20, legB: 26, shinB: 26, root: [0, 8, 0] }, e: 'linear' },
    { t: 0.9,  b: { armF: -10, foreF: -30, weapon: 180, armB: 20, torso: 2, cape: 6, root: [0, 0, 0] } },
  ] },
};
CLIPS.oni = {
  idle: { len: 3.0, loop: true, keys: [
    { t: 0,   b: { body: 0, head: 0, armF: -10, armB: 10, root: [0, 0, 0] } },
    { t: 1.5, b: { body: 2, head: -3, armF: -18, armB: 16, root: [0, 0, -4] } },
  ] },
  run: { len: 3.0, loop: true, keys: [ { t: 0, b: { body: 0, armF: -10, armB: 10 } }, { t: 1.5, b: { body: 2, armF: -18, armB: 16, root: [0, 0, -4] } } ] },
  melee: { len: 1.0, loop: false, keys: [
    { t: 0,    b: { armF: -120, armB: 20, body: -8, head: -6, root: [0, -6, 0] } },
    { t: 0.45, b: { armF: -160, armB: 30, body: -14, head: -10, root: [0, -10, -6] } },
    { t: 0.55, b: { armF: -20, armB: -10, body: 16, head: 12, root: [0, 10, 4] }, e: 'linear' },
    { t: 1.0,  b: { armF: -10, armB: 10, body: 0, head: 0, root: [0, 0, 0] } },
  ] },
  hurt: { len: 0.3, loop: false, keys: [ { t: 0, b: { body: -10, head: -8, armF: -50, armB: 50, root: [0, -4, 0] } }, { t: 0.3, b: { armF: -10, armB: 10 } } ] },
};
