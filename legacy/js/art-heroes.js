/* Art: герои. Каждая часть — матрица (символ → цвет палитры скина), pivot — пиксель, стоящий на кости,
   bone — кость, z — порядок отрисовки (меньше = дальше). Персонаж нарисован лицом ВПРАВО.
   Конечности рисуются свисающими вниз (pivot сверху), торс и голова — стоящими вверх (pivot снизу),
   оружие — «вверх» от рукояти (pivot на рукояти). */

const SKINS = {};

/* ---------------- Магичка: белые волосы, чёрные рога, белый плащ, чёрные сапоги, посох со сферой ---------------- */
SKINS.mage = {
  id: 'mage', rest: { weapon: 0 }, upright: { weapon: -6 },
  pal: { k: '#15141c', K: '#2a2636', h: '#f7f5fb', H: '#dcd7ea', g: '#b9b1cf', s: '#f6dfd0', S: '#e0b9a8', r: '#d94a44',
         w: '#ffffff', W: '#e6e2f0', x: '#c5bdda', b: '#2a2530', B: '#443d52', t: '#4a3426', T: '#6b4d38', o: '#e8fdff', O: '#7fd8ff', p: '#c48cff' },
  parts: {
    cape:  { bone: 'cape', z: 0, pivot: [8, 0], rows: [
      '.kkkkkkkk.', 'kwwwwwwwwk', 'kwwwwwwwWk', 'kwwwwwwWWk', 'kwwwwwwWWk', 'kwwwwwwWxk', 'kwwwwwWWxk', 'kwwwwwWWxk', 'kwwwwwWWxk',
      'kwwwwWWWxk', 'kwwwwWWWxk', 'kwwwWWWxxk', 'kwwwWWWxxk', 'kwwWWWWxxk', 'kwwWWWxxxk', 'kwWWWWxxxk', 'kwWWWxxxxk', 'kWWWWxxxxk', 'kWWWxxxxxk', 'kWWxxxxxxk', '.kkkkkkkk.' ] },
    hairB: { bone: 'hairB', z: 1, pivot: [6, 0], rows: [
      'kkhhhhhk', 'khhhhhhk', 'khhhhhhk', 'khHhhhhk', 'khHhhhhk', 'khHhhhh.', 'khHhhhk.', '.kHhhhk.', '.kHhhhk.', '.kHHhhk.', '.kHHhhk.',
      '..kHhhk.', '..kHhhk.', '..kHhhk.', '..kHHhk.', '.kHHhhk.', '.kHHhk..', '.kHhhk..', '.kHhk...', '..kk....' ] },
    armB:  { bone: 'armB', z: 2, pivot: [2, 0], rows: ['.kkk.', 'kwwwk', 'kwwWk', 'kwwWk', 'kwwWk', 'kwwWk', 'kwWxk', 'kwWxk', '.kkk.'] },
    foreB: { bone: 'foreB', z: 3, pivot: [2, 0], rows: ['.kkk.', 'kwwWk', 'kwwWk', 'kwwWk', 'kwWxk', 'kwWxk', '.kkk.', '.kssk', '.kssk', '..kk.'] },
    legB:  { bone: 'legB', z: 4, pivot: [2, 0], rows: ['.kkkk.', 'kbBbbk', 'kbBbbk', 'kbBbbk', 'kbbbbk', 'kbbbbk', 'kbbbbk', 'kbbbbk', 'kbbbbk', 'kbbbbk', '.kkkk.'] },
    shinB: { bone: 'shinB', z: 5, pivot: [2, 0], rows: ['.kkkk..', 'kbBbbk.', 'kbBbbk.', 'kbbbbk.', 'kbbbbk.', 'kbbbbk.', 'kbbbbk.', 'kbbbbk.', 'kbbbbk.', 'kbbbbk.', 'kbbbbkk.', 'kbbbbbbk', '.kkkkkk.'] },
    torso: { bone: 'torso', z: 6, pivot: [5, 11], rows: [
      '...kkkkkk...', '..kwwwwwwk..', '.kwwwwwwwwk.', '.kwwwwwwwWk.', 'kwwwwwwwwWWk', 'kwwwwwwwwWWk', 'kwwwwwwwwWxk', 'kwwwwwwwWWxk',
      'kwwwwwwwWWxk', '.kwwwwwWWxk.', '.kbbbbbbbbk.', '.kbBBbbbbbk.', '.kwwwwwwWxk.', 'kwwwwwwwWWxk', 'kwwwwwwwWWxk', 'kkkkkkkkkkkk' ] },
    head:  { bone: 'head', z: 7, pivot: [6, 14], rows: [
      '..kk......kk..', '..kk......kk..', '.khhhhhhhhhhk.', 'khhhhhhhhhhhhk', 'khhhhhhhhhhhhk', 'kHhhhhhhhhhhhk', 'kHhhhhhssssshk',
      'kHhhhhssssssSk', 'kHHhhhsrssrsSk', '.kHhhhssssssk.', '.kHHhhSsssSsk.', '..kHhhhsSSSk..', '...kkhhkkkk...', '.....kssk.....', '.....kssk.....' ] },
    legF:  { bone: 'legF', z: 8, pivot: [2, 0], rows: ['.kkkk.', 'kbBbbk', 'kbBbbk', 'kbBbbk', 'kbbbbk', 'kbbbbk', 'kbbbbk', 'kbbbbk', 'kbbbbk', 'kbbbbk', '.kkkk.'] },
    shinF: { bone: 'shinF', z: 9, pivot: [2, 0], rows: ['.kkkk..', 'kbBbbk.', 'kbBbbk.', 'kbbbbk.', 'kbbbbk.', 'kbbbbk.', 'kbbbbk.', 'kbbbbk.', 'kbbbbk.', 'kbbbbk.', 'kbbbbkk.', 'kbbbbbbk', '.kkkkkk.'] },
    armF:  { bone: 'armF', z: 10, pivot: [2, 0], rows: ['.kkk.', 'kwwwk', 'kwwWk', 'kwwWk', 'kwwWk', 'kwwWk', 'kwWxk', 'kwWxk', '.kkk.'] },
    weapon:{ bone: 'weapon', z: 11, pivot: [2, 26], rows: [
      '.pOp.', 'pOoOp', 'pOoOp', '.pOp.', '.kkk.', '.kTk.', ...Array.from({ length: 34 }, (_, i) => i % 4 === 0 ? '..T..' : '..t..') ] },
    foreF: { bone: 'foreF', z: 12, pivot: [2, 0], rows: ['.kkk.', 'kwwWk', 'kwwWk', 'kwwWk', 'kwWxk', 'kwWxk', '.kkk.', '.kssk', '.kssk', '..kk.'] },
  },
};

/* ---------------- Берсерк: красный капюшон и плащ, тёмная броня, огромный меч ---------------- */
SKINS.warrior = {
  id: 'warrior', rest: { weapon: 170, armF: 30, foreF: -170 }, upright: { weapon: 38 },
  pal: { k: '#0e0c14', a: '#3f4253', A: '#272935', l: '#5f6376', r: '#c23b2e', R: '#7d2019', p: '#e0554a', d: '#1a1016', e: '#ffd9a0',
         b: '#d4d9e3', B: '#8e94a3', E: '#f4f6fa', t: '#4a3020', T: '#6b4d38', s: '#2a2530' },
  parts: {
    cape:  { bone: 'cape', z: 0, pivot: [8, 0], rows: [
      '.kkkkkkkk.', 'krrrrrrrrk', 'krrrrrrrRk', 'krrrrrrRRk', 'krrrrrrRRk', 'kprrrrrRRk', 'kprrrrRRRk', 'kprrrrRRRk', 'krrrrrRRRk',
      'krrrrRRRRk', 'krrrrRRRRk', 'krrrRRRRRk', 'krrrRRRRRk', 'krrRRRRRRk', 'krrRRRRRRk', 'krRRRRRRRk', 'kRRRRRRRRk', 'kRRRRRRRk.', 'kRRRRRkRk.', 'kRRRkkkk..', '.kkkk.....' ] },
    armB:  { bone: 'armB', z: 2, pivot: [2, 0], rows: ['kkkkkk', 'klaaak', 'klaaak', 'kaaaAk', '.kaaAk', '.kaaAk', '.kaaAk', '.kaaAk', '.kkkk.'] },
    foreB: { bone: 'foreB', z: 3, pivot: [2, 0], rows: ['.kkk.', 'kaaAk', 'kaaAk', 'kaaAk', 'kaaAk', 'klaAk', '.kkk.', '.kAk.', '.kAk.', '..k..'] },
    legB:  { bone: 'legB', z: 4, pivot: [2, 0], rows: ['.kkkk.', 'kaaaAk', 'kaaaAk', 'kaaaAk', 'kaaaAk', 'kAaaAk', 'kAaaAk', 'kAaaAk', 'kAAAAk', 'kAAAAk', '.kkkk.'] },
    shinB: { bone: 'shinB', z: 5, pivot: [2, 0], rows: ['.kkkk...', 'kaaaAk..', 'kaaaAk..', 'kaaaAk..', 'kaaaAk..', 'kAaaAk..', 'kAaaAk..', 'kAaaAk..', 'kAAAAk..', 'kAAAAk..', 'kAAAAkk.', 'kAAAAAAk', '.kkkkkk.'] },
    torso: { bone: 'torso', z: 6, pivot: [5, 11], rows: [
      '..kkkkkkkk..', '.klaaaaaalk.', 'kllaarraaalk', 'kaaaarraaaAk', 'kaaaarraaaAk', 'kaaaRrraaAAk', 'kaaaRrrAaAAk', 'kAaaRrrAAAAk',
      'kAaaRrrAAAAk', '.kAaRrrAAAk.', '.kkkkkkkkkk.', '.kAAAAAAAAk.', '.krrrRRrrrk.', '.krrrRRrrrk.', '.kRrrRRrrRk.', '..kkkkkkkk..' ] },
    head:  { bone: 'head', z: 7, pivot: [6, 14], rows: [
      '....kkkkk.....', '...krrrrrk....', '..krrrrrrrk...', '.krrrrrrrrrk..', '.krrrrrrrrRk..', 'krrrrrRddddRk.', 'krrrrRddddddk.',
      'krrrrRdddedek.', 'krrrrRddddddk.', '.krrrRdddddk..', '.krrrrRdddk...', '..krrrrRRk....', '...kRRRRk.....', '....kkkk......', '.....kk.......' ] },
    legF:  { bone: 'legF', z: 8, pivot: [2, 0], rows: ['.kkkk.', 'kaaaAk', 'kaaaAk', 'kaaaAk', 'kaaaAk', 'kAaaAk', 'kAaaAk', 'kAaaAk', 'kAAAAk', 'kAAAAk', '.kkkk.'] },
    shinF: { bone: 'shinF', z: 9, pivot: [2, 0], rows: ['.kkkk...', 'kaaaAk..', 'kaaaAk..', 'kaaaAk..', 'kaaaAk..', 'kAaaAk..', 'kAaaAk..', 'kAaaAk..', 'kAAAAk..', 'kAAAAk..', 'kAAAAkk.', 'kAAAAAAk', '.kkkkkk.'] },
    armF:  { bone: 'armF', z: 10, pivot: [2, 0], rows: ['kkkkkk', 'klaaak', 'klaaak', 'kaaaAk', '.kaaAk', '.kaaAk', '.kaaAk', '.kaaAk', '.kkkk.'] },
    weapon:{ bone: 'weapon', z: 11, pivot: [3, 36], rows: [
      '...kk...', '..kbEk..', '..kbEk..', '.kBbbEk.', ...Array.from({ length: 27 }, () => '.kBbbEk.'), 'kkkkkkkk', 'kkkkkkkk',
      '..ktTk..', '..ktTk..', '..ktTk..', '..ktTk..', '..ktTk..', '..ktTk..', '..kkkk..', '..kAAk..', '..kkkk..' ] },
    foreF: { bone: 'foreF', z: 12, pivot: [2, 0], rows: ['.kkk.', 'kaaAk', 'kaaAk', 'kaaAk', 'kaaAk', 'klaAk', '.kkk.', '.kAk.', '.kAk.', '..k..'] },
  },
};

/* ---------------- Самурай: чёрные волосы и рубаха, светлые хакама, синий пояс, катана ---------------- */
SKINS.samurai = {
  id: 'samurai', rest: { weapon: 200 }, upright: { weapon: 208 },
  pal: { k: '#141824', h: '#1c2030', H: '#353b55', s: '#eec2a2', S: '#cfa083', e: '#141824', w: '#ececf0', W: '#c9c9d6', x: '#a3a3b8',
         n: '#2b3a5e', N: '#3e5488', b: '#dfe4ee', B: '#9aa1b0', E: '#ffffff', t: '#3a2a24', T: '#5a4236' },
  parts: {
    cape:  { bone: 'cape', z: 0, pivot: [5, 0], rows: ['kkkkkk', 'knnnnk', 'knnNnk', '.knnnk', '.knNnk', '.knnnk', '..knnk', '..knnk', '..kNnk', '..knnk', '...knk', '...knk', '...kk.'] },
    armB:  { bone: 'armB', z: 2, pivot: [2, 0], rows: ['.kkk.', 'khhhk', 'khhHk', 'khhHk', '.kssk', '.kssk', '.kssk', '.kSsk', '.kkk.'] },
    foreB: { bone: 'foreB', z: 3, pivot: [2, 0], rows: ['.kkk.', 'kssSk', 'kssSk', 'kssSk', 'kssSk', 'kSsSk', '.kkk.', '.kssk', '.kssk', '..kk.'] },
    legB:  { bone: 'legB', z: 4, pivot: [3, 0], rows: ['.kkkkkk.', 'kwwwwwWk', 'kwwwwwWk', 'kwwwwwWk', 'kwwwwWWk', 'kwwwwWWk', 'kwwwwWxk', 'kwwwwWxk', 'kwwwWWxk', 'kwwwWWxk', '.kkkkkk.'] },
    shinB: { bone: 'shinB', z: 5, pivot: [3, 0], rows: ['.kkkkkk.', 'kwwwwwWk', 'kwwwwwWk', 'kwwwwWWk', 'kwwwwWWk', 'kwwwwWxk', 'kwwwwWxk', 'kwwwWWxk', 'kwwwWWxk', '.kwwWxk.', '.kkkkkk.', '.kkkkkkk', '..kkkkk.'] },
    torso: { bone: 'torso', z: 6, pivot: [5, 11], rows: [
      '...kkkkkk...', '..khhhhhhk..', '.khhhhhhhhk.', '.khhhhhhhHk.', 'khhhhhhhhHHk', 'khhhhhhhhHHk', 'khhhhhhhhHHk', 'khhhhhhhHHHk',
      '.khhhhhhHHk.', '.khhhhhhHHk.', '.knNNnnnnnk.', '.knnnnnnnnk.', '.kwwwwwwWxk.', 'kwwwwwwwWWxk', 'kwwwwwwwWWxk', 'kkkkkkkkkkkk' ] },
    head:  { bone: 'head', z: 7, pivot: [6, 14], rows: [
      '....kkkkk.....', '..kkhhhhhkk...', '.khhhhhhhhhk..', 'khhhhHhhhhhhk.', 'khhhhhhhhhhhhk', 'khhHhhhsssshhk', 'khhhhhssssssSk',
      'khhhhhsesssSSk', '.khhhhssssssk.', '.khhhhSsssSsk.', '..khhhhsSSSk..', '...kkhhkkkk...', '.....kssk.....', '.....kssk.....', '......kk......' ] },
    legF:  { bone: 'legF', z: 8, pivot: [3, 0], rows: ['.kkkkkk.', 'kwwwwwWk', 'kwwwwwWk', 'kwwwwwWk', 'kwwwwWWk', 'kwwwwWWk', 'kwwwwWxk', 'kwwwwWxk', 'kwwwWWxk', 'kwwwWWxk', '.kkkkkk.'] },
    shinF: { bone: 'shinF', z: 9, pivot: [3, 0], rows: ['.kkkkkk.', 'kwwwwwWk', 'kwwwwwWk', 'kwwwwWWk', 'kwwwwWWk', 'kwwwwWxk', 'kwwwwWxk', 'kwwwWWxk', 'kwwwWWxk', '.kwwWxk.', '.kkkkkk.', '.kkkkkkk', '..kkkkk.'] },
    armF:  { bone: 'armF', z: 10, pivot: [2, 0], rows: ['.kkk.', 'khhhk', 'khhHk', 'khhHk', '.kssk', '.kssk', '.kssk', '.kSsk', '.kkk.'] },
    weapon:{ bone: 'weapon', z: 11, pivot: [2, 22], rows: [
      '..k..', '.kbE.', ...Array.from({ length: 19 }, () => '.kbE.'), 'kkkkk', '.ktk.', '.kTk.', '.ktk.', '.kTk.', '.ktk.', '.kTk.', '.kkk.' ] },
    foreF: { bone: 'foreF', z: 12, pivot: [2, 0], rows: ['.kkk.', 'kssSk', 'kssSk', 'kssSk', 'kssSk', 'kSsSk', '.kkk.', '.kssk', '.kssk', '..kk.'] },
  },
};
