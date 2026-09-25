/* Sprites / Pix — мелкие статичные спрайты (костёр) и загрузчик фоновых картинок. Персонажи живут в rig.js / art-*.js. */

const SPRITES = {
  fire1: { pal: { o: '#ff8c3a', y: '#ffe36b', t: '#4a2f18' }, rows: ['....o....', '...oo....', '..oyo.o..', '..oyyoo..', '.ooyyyo..', '.oyyyyoo.', '.oyyyyyo.', 'ttttttttt'] },
  fire2: { pal: { o: '#ff8c3a', y: '#ffe36b', t: '#4a2f18' }, rows: ['......o..', '..o..oo..', '..oo.oy..', '..oyooy..', '..oyyyo..', '.ooyyyoo.', '.oyyyyyo.', 'ttttttttt'] },
};

const IMAGE_ASSETS = {
  'bg:forest': 'assets/bg/forest.png', 'bg:cave': 'assets/bg/cave.png', 'bg:crystal': 'assets/bg/crystal.png',
  'bg:deadwood': 'assets/bg/deadwood.png', 'bg:sakura': 'assets/bg/sakura.png', 'bg:arena': 'assets/bg/arena.png',
};
const Assets = {
  images: {},
  load() {
    return Promise.all(Object.entries(IMAGE_ASSETS).map(([k, src]) => new Promise(res => {
      const im = new Image(); im.onload = () => { this.images[k] = im; res(); }; im.onerror = () => res(); im.src = src;
    })));
  },
};

const Pix = {
  cache: new Map(),
  get(name, tint) {
    const key = `${name}|${tint || ''}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const def = SPRITES[name], rows = def.rows;
    const c = document.createElement('canvas'); c.width = Math.max(...rows.map(r => r.length)); c.height = rows.length;
    const g = c.getContext('2d');
    rows.forEach((row, y) => { [...row].forEach((ch, x) => { if (ch === '.') return; g.fillStyle = tint || def.pal[ch] || '#ff00ff'; g.fillRect(x, y, 1, 1); }); });
    this.cache.set(key, c); return c;
  },
  draw(ctx, name, x, y, scale = 1, o = {}) {
    const c = this.get(name, o.tint), w = c.width * scale, h = c.height * scale;
    ctx.save(); ctx.imageSmoothingEnabled = false; if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.flip) { ctx.translate(R(x), R(y)); ctx.scale(-1, 1); ctx.drawImage(c, -R(w / 2), -h, w, h); } else ctx.drawImage(c, R(x - w / 2), R(y - h), w, h);
    ctx.restore();
  },
  shadow(ctx, x, y, w) { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(R(x - w / 2), R(y) - 1, R(w), 2); },
};
