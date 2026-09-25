/* Biomes — процедурные параллакс-фоны. Каждый биом собирает несколько слоёв-канвасов (тайлятся по X),
   цвета земли и параметры атмосферных частиц. Всё рисуется целочисленными прямоугольниками ради пиксельной сетки. */

const D = {
  rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(R(x), R(y), Math.max(1, R(w)), Math.max(1, R(h))); },
  /* Сосулька/сталактит: сужается вниз от (cx, y0). */
  stalactite(g, cx, y0, w, h, c) { g.fillStyle = c; for (let i = 0; i < h; i++) { const ww = Math.max(1, R(w * (1 - i / h))); g.fillRect(R(cx - ww / 2), R(y0 + i), ww, 1); } },
  /* Сталагмит: расширяется вниз к (cx, y1). */
  stalagmite(g, cx, y1, w, h, c) { g.fillStyle = c; for (let i = 0; i < h; i++) { const ww = Math.max(1, R(w * (1 - i / h))); g.fillRect(R(cx - ww / 2), R(y1 - i), ww, 1); } },
  /* Облако из случайных прямоугольников — листва, кусты, дым. */
  clump(g, rng, cx, cy, rx, ry, colors, n, smin = 2, smax = 5) {
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2, d = Math.sqrt(rng());
      const x = cx + Math.cos(a) * d * rx, y = cy + Math.sin(a) * d * ry, s = smin + rng() * (smax - smin);
      g.fillStyle = colors[Math.floor(rng() * colors.length)]; g.fillRect(R(x), R(y), R(s), R(s));
    }
  },
  /* Голое дерево-силуэт: ствол и ветви, растущие вверх-в стороны. */
  bareTree(g, rng, x, baseY, h, w, c) {
    g.fillStyle = c;
    for (let i = 0; i < h; i++) { const ww = Math.max(1, R(w * (1 - i / h * 0.6))); g.fillRect(R(x - ww / 2), R(baseY - i), ww, 1); }
    const nb = 3 + Math.floor(rng() * 3);
    for (let b = 0; b < nb; b++) {
      const sy = baseY - h * (0.35 + rng() * 0.6), dir = rng() < 0.5 ? -1 : 1, len = 8 + rng() * h * 0.25;
      let bx = x, by = sy, bw = Math.max(1, R(w * 0.4));
      for (let i = 0; i < len; i++) { bx += dir * (0.5 + rng() * 0.6); by -= 0.4 + rng() * 0.5; g.fillRect(R(bx), R(by), bw, 1); if (i > len * 0.5) bw = 1; }
    }
  },
  /* Кристалл: наклонный шестигранник, левая грань темнее, правая светлее, верх — блик. */
  crystal(g, cx, baseY, w, h, tilt, cols) {
    for (let i = 0; i < h; i++) {
      const k = i / h, ww = k < 0.75 ? w : w * (1 - (k - 0.75) / 0.25), x = cx + tilt * i;
      const lw = R(ww * 0.45), rw = Math.max(1, R(ww) - lw);
      g.fillStyle = cols[0]; g.fillRect(R(x - ww / 2), R(baseY - i), lw, 1);
      g.fillStyle = cols[1]; g.fillRect(R(x - ww / 2) + lw, R(baseY - i), rw, 1);
      if (k > 0.75) { g.fillStyle = cols[2]; g.fillRect(R(x - ww / 2) + lw, R(baseY - i), Math.max(1, R(rw * 0.5)), 1); }
    }
  },
  /* Диагональная полоса света (луч). */
  beam(g, x0, w, slope, color, alpha, h) {
    g.globalAlpha = alpha; g.fillStyle = color;
    for (let y = 0; y < h; y++) g.fillRect(R(x0 + y * slope), y, R(w), 1);
    g.globalAlpha = 1;
  },
  circleOutline(g, cx, cy, r, c, t = 2) {
    g.fillStyle = c;
    for (let a = 0; a < 360; a += 2) { const x = cx + Math.cos(a / 57.3) * r, y = cy + Math.sin(a / 57.3) * r; g.fillRect(R(x), R(y), t, t); }
  },
  vgrad(g, w, h, stops) { const gr = g.createLinearGradient(0, 0, 0, h); for (const [k, c] of stops) gr.addColorStop(k, c); g.fillStyle = gr; g.fillRect(0, 0, w, h); },
};

const Biomes = {
  layer(w, h, seed, fn) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    fn(g, mulberry32(seed), w, h); return c;
  },
  cache: {},
  build(id) { if (!this.cache[id]) this.cache[id] = this[id](); return this.cache[id]; },

  /* Изумрудный лес: тёмно-зелёная глубина с лучами, мшистые стволы, яркая листва, цветы. */
  forest() {
    const W = 960, H = VH;
    const far = this.layer(W, H, 11, (g, rng) => {
      D.vgrad(g, W, H, [[0, '#0f2a22'], [0.6, '#1a4634'], [1, '#2a5e3a']]);
      for (let i = 0; i < 16; i++) D.rect(g, rng() * W, 0, 8 + rng() * 12, H, '#0c231c');
      for (let i = 0; i < 6; i++) D.beam(g, rng() * W, 14 + rng() * 20, 0.3, '#d8f0a0', 0.07, H);
    });
    const mid = this.layer(W, H, 12, (g, rng) => {
      for (let i = 0; i < 9; i++) {
        const x = rng() * W, w = 16 + rng() * 10;
        D.rect(g, x, 40, w, H, '#3a2818'); D.rect(g, x, 40, 2, H, '#221708'); D.rect(g, x + w - 3, 40, 3, H, '#55391f');
        for (let m = 0; m < 5; m++) D.clump(g, rng, x + rng() * w, 80 + rng() * 140, 5, 8, ['#3f8a3a', '#2f6b2f'], 8, 1, 3);
      }
      for (let i = 0; i < 14; i++) D.clump(g, rng, rng() * W, 10 + rng() * 60, 50, 24, ['#1f5a2a', '#2d7a35', '#3f9a3f'], 50);
    });
    const near = this.layer(W, H, 13, (g, rng) => {
      for (let i = 0; i < 5; i++) {
        const x = 60 + i * 190 + rng() * 60, w = 34 + rng() * 12;
        D.rect(g, x, 0, w, H, '#4a3222'); D.rect(g, x, 0, 4, H, '#2a1a0e'); D.rect(g, x + w - 5, 0, 5, H, '#6f4c32');
        D.rect(g, x - 8, 226, w + 16, 12, '#4a3222'); D.rect(g, x - 14, 232, w + 28, 6, '#2a1a0e');
        for (let m = 0; m < 7; m++) D.clump(g, rng, x + rng() * w, 40 + rng() * 170, 7, 10, ['#4c9a3c', '#3a7a2e', '#6fc04a'], 12, 1, 3);
      }
      for (let i = 0; i < 18; i++) D.clump(g, rng, rng() * W, rng() * 40, 60, 22, ['#173f1f', '#22582a', '#2f7a35', '#4c9a3c'], 70);
      for (let i = 0; i < 14; i++) D.clump(g, rng, rng() * W, 222 + rng() * 10, 26, 10, ['#245c2a', '#2f7a33', '#4c9a3c'], 40);
      for (let i = 0; i < 60; i++) D.rect(g, rng() * W, 226 + rng() * 10, 1, 1, rng() < 0.5 ? '#f2e97a' : '#ffffff');
    });
    return { photo: 'bg:forest', layers: [{ c: far, s: 0.12 }, { c: mid, s: 0.4 }, { c: near, s: 0.75 }],
      ground: { top: '#5aa843', fill: '#3c7a34', dark: '#2a5426', deco: ['#f0e878', '#7fd45a'] },
      ambient: { colors: ['#f6f0a0', '#ffffff'], vy: -6, vx: 4, size: 1, n: 40 }, vignette: 0.35, gate: '#4ee8c0' };
  },

  /* Гулкая пещера: тёплые песчаные своды, сталактиты в три плана. */
  cave() {
    const W = 960, H = VH;
    const far = this.layer(W, H, 21, (g, rng) => {
      D.vgrad(g, W, H, [[0, '#c9b58a'], [0.5, '#e8dcb2'], [1, '#b39a68']]);
      g.globalAlpha = 0.35; for (let i = 0; i < 40; i++) D.rect(g, W / 2 - 200 + rng() * 400, 0, 6 + rng() * 10, H, '#f4ecc8'); g.globalAlpha = 1;
      for (let i = 0; i < 18; i++) D.stalactite(g, rng() * W, 0, 20 + rng() * 40, 60 + rng() * 120, '#c4ad7e');
      for (let i = 0; i < 14; i++) D.stalagmite(g, rng() * W, H, 20 + rng() * 40, 40 + rng() * 90, '#b59c6c');
    });
    const mid = this.layer(W, H, 22, (g, rng) => {
      for (let i = 0; i < 12; i++) D.stalactite(g, rng() * W, 0, 14 + rng() * 22, 40 + rng() * 110, '#8a6242');
      for (let i = 0; i < 4; i++) { const x = rng() * W; D.stalactite(g, x, 0, 30, 150, '#9a7250'); D.stalagmite(g, x, H, 34, 150, '#9a7250'); }
      for (let i = 0; i < 10; i++) D.stalagmite(g, rng() * W, H, 16 + rng() * 26, 30 + rng() * 70, '#7a5238');
    });
    const near = this.layer(W, H, 23, (g, rng) => {
      D.rect(g, 0, 0, W, 10, '#4a2e20');
      for (let i = 0; i < 16; i++) D.stalactite(g, rng() * W, 8, 10 + rng() * 18, 20 + rng() * 50, '#4a2e20');
      for (let i = 0; i < 8; i++) D.clump(g, rng, rng() * W, 228 + rng() * 6, 30, 12, ['#5a3a28', '#6b4630', '#4a2e20'], 40, 3, 7);
    });
    return { photo: 'bg:cave', layers: [{ c: far, s: 0.1 }, { c: mid, s: 0.4 }, { c: near, s: 0.8 }],
      ground: { top: '#8a5c3c', fill: '#6b4630', dark: '#4a2e20', deco: ['#a87a54', '#c4ad7e'] },
      ambient: { colors: ['#e8d8a8'], vy: 4, vx: 0, size: 1, n: 25 }, vignette: 0.2, gate: '#4ee8c0' };
  },

  /* Кристальный грот: тёмная синева, бледные лавандовые шпили, синие и розовые кристаллы. */
  crystal() {
    const W = 960, H = VH;
    const far = this.layer(W, H, 31, (g, rng) => {
      D.vgrad(g, W, H, [[0, '#080c26'], [1, '#23255a']]);
      for (let i = 0; i < 7; i++) D.crystal(g, 60 + i * 140 + rng() * 60, H + 10, 40 + rng() * 40, 150 + rng() * 100, (rng() - 0.5) * 0.5, ['#6e6ab0', '#9c96d8', '#cfcaf5']);
      for (let i = 0; i < 20; i++) D.clump(g, rng, rng() * W, rng() * 30, 50, 16, ['#12122e', '#1a1a3e'], 40, 3, 8);
      for (let i = 0; i < 16; i++) D.stalactite(g, rng() * W, 20, 4 + rng() * 6, 10 + rng() * 26, rng() < 0.5 ? '#ff5fc8' : '#ff9ae0');
    });
    const mid = this.layer(W, H, 32, (g, rng) => {
      for (let i = 0; i < 8; i++) D.clump(g, rng, rng() * W, 236, 50, 20, ['#1a1c3e', '#22244a'], 60, 3, 8);
      for (let i = 0; i < 16; i++) D.crystal(g, rng() * W, 238, 8 + rng() * 12, 26 + rng() * 50, (rng() - 0.5) * 0.4, ['#3a5cff', '#6c9cff', '#c0dcff']);
      for (let i = 0; i < 10; i++) D.crystal(g, rng() * W, 238, 4 + rng() * 5, 10 + rng() * 16, 0, ['#c83aa0', '#ff5fc8', '#ffb0ea']);
    });
    const near = this.layer(W, H, 33, (g, rng) => {
      for (let i = 0; i < 3; i++) D.beam(g, rng() * W, 8 + rng() * 6, 0.45, '#07071a', 1, H);
      for (let i = 0; i < 6; i++) D.crystal(g, rng() * W, 250, 14, 30 + rng() * 30, (rng() - 0.5) * 0.6, ['#151735', '#20224a', '#33366a']);
    });
    return { photo: 'bg:crystal', layers: [{ c: far, s: 0.1 }, { c: mid, s: 0.4 }, { c: near, s: 0.8 }],
      ground: { top: '#2a2c52', fill: '#161836', dark: '#0c0d24', deco: ['#5a7cff', '#ff9ae0'] },
      ambient: { colors: ['#8fb8ff', '#ff9ae0', '#ffffff'], vy: -3, vx: 0, size: 1, n: 40 }, vignette: 0.45, gate: '#4ee8c0' };
  },

  /* Мёртвый лес: розово-пурпурный закат и слои голых силуэтов. */
  deadwood() {
    const W = 960, H = VH;
    const far = this.layer(W, H, 41, (g, rng) => {
      D.vgrad(g, W, H, [[0, '#24103a'], [0.45, '#ff6a9a'], [0.8, '#b03a8a'], [1, '#4a1a5a']]);
      for (let i = 0; i < 16; i++) D.bareTree(g, rng, rng() * W, 250, 140 + rng() * 80, 4 + rng() * 4, '#7a2f8f');
    });
    const mid = this.layer(W, H, 42, (g, rng) => {
      for (let i = 0; i < 12; i++) D.bareTree(g, rng, rng() * W, 250, 160 + rng() * 80, 6 + rng() * 5, '#3d1656');
      for (let i = 0; i < 4; i++) D.beam(g, rng() * W, 10 + rng() * 14, -0.35, '#ffd0e8', 0.12, H);
    });
    const near = this.layer(W, H, 43, (g, rng) => {
      for (let i = 0; i < 7; i++) D.bareTree(g, rng, 40 + i * 140 + rng() * 60, 260, 200 + rng() * 70, 10 + rng() * 7, '#180826');
      for (let i = 0; i < 90; i++) D.stalagmite(g, rng() * W, 238, 3, 6 + rng() * 14, '#2a0e3c');
    });
    return { photo: 'bg:deadwood', layers: [{ c: far, s: 0.1 }, { c: mid, s: 0.4 }, { c: near, s: 0.8 }],
      ground: { top: '#3a1450', fill: '#22092f', dark: '#150520', deco: ['#6a2a80', '#ff6a9a'] },
      ambient: { colors: ['#ff8ab0', '#c05aa0'], vy: -8, vx: 3, size: 1, n: 30 }, vignette: 0.3, gate: '#3fd66a' };
  },

  /* Сад тишины: бирюзовый туман, огромная сакура, скамейка и фонарь. */
  sakura() {
    const W = 960, H = VH;
    const far = this.layer(W, H, 51, (g, rng) => {
      D.vgrad(g, W, H, [[0, '#2c6a5e'], [1, '#12332e']]);
      for (let i = 0; i < 10; i++) D.rect(g, rng() * W, 30 + rng() * 40, 6 + rng() * 8, H, '#1d4a42');
      g.globalAlpha = 0.18; for (let i = 0; i < 6; i++) D.rect(g, 0, 120 + i * 18, W, 8 + rng() * 8, '#7fb8a8'); g.globalAlpha = 1;
    });
    const mid = this.layer(W, H, 52, (g, rng) => {
      for (let i = 0; i < 12; i++) D.rect(g, rng() * W, 20 + rng() * 60, 5 + rng() * 6, H, '#163a35');
      for (let i = 0; i < 8; i++) D.clump(g, rng, rng() * W, 50 + rng() * 60, 40, 18, ['#9c4a72', '#b8608c'], 30, 2, 4);
    });
    const near = this.layer(W, H, 53, (g, rng) => {
      // ствол сакуры с наклоном и ветвями
      for (let i = 0; i < 130; i++) { const ww = 22 - i * 0.1; D.rect(g, 440 + i * 0.35 - ww / 2, 236 - i, ww, 1, i % 7 === 0 ? '#2a1c1c' : '#3a2a2a'); }
      D.rect(g, 420, 226, 60, 10, '#3a2a2a'); D.rect(g, 410, 232, 80, 4, '#2a1c1c');
      for (let b = 0; b < 6; b++) { let bx = 470, by = 140 - b * 12, dir = b % 2 ? 1 : -1; for (let i = 0; i < 60 + b * 10; i++) { bx += dir * 1.1; by -= 0.35; D.rect(g, bx, by, 4, 2, '#3a2a2a'); } }
      D.clump(g, rng, 470, 80, 230, 60, ['#b8507f', '#e07fae', '#f4aacb', '#f9c9de'], 900, 2, 5);
      D.clump(g, rng, 470, 60, 150, 40, ['#e07fae', '#f4aacb', '#f9c9de'], 400, 2, 4);
      // скамейка и фонарь
      D.rect(g, 560, 214, 44, 4, '#7a5634'); D.rect(g, 560, 206, 44, 3, '#6b4a2c'); D.rect(g, 560, 200, 44, 3, '#6b4a2c');
      D.rect(g, 562, 218, 3, 18, '#4a3020'); D.rect(g, 599, 218, 3, 18, '#4a3020'); D.rect(g, 562, 200, 3, 16, '#4a3020'); D.rect(g, 599, 200, 3, 16, '#4a3020');
      D.rect(g, 528, 190, 3, 46, '#2a2424'); D.rect(g, 522, 178, 15, 14, '#3a3030'); D.rect(g, 524, 180, 11, 10, '#ffcf6b'); D.rect(g, 527, 183, 5, 4, '#fff2c0');
      g.globalAlpha = 0.12; D.rect(g, 505, 170, 50, 60, '#ffcf6b'); g.globalAlpha = 1;
      for (let i = 0; i < 80; i++) D.rect(g, rng() * W, 226 + rng() * 10, 2, 1, rng() < 0.6 ? '#f4aacb' : '#e07fae');
    });
    return { photo: 'bg:sakura', layers: [{ c: far, s: 0.1 }, { c: mid, s: 0.35 }, { c: near, s: 0.7 }],
      ground: { top: '#4f8a52', fill: '#33613a', dark: '#22452a', deco: ['#f2a5c6', '#7fd45a'] },
      ambient: { colors: ['#f4aacb', '#e07fae', '#ffffff'], vy: 14, vx: -10, size: 2, n: 50 }, vignette: 0.25, gate: '#ff5f6d' };
  },

  /* Алый предел: багровое небо, кольцо солнца, исполинский силуэт Они, тории и чёрные скалы. */
  arena() {
    const W = 960, H = VH;
    const far = this.layer(W, H, 61, (g, rng) => {
      D.vgrad(g, W, H, [[0, '#e8404f'], [0.7, '#b0243a'], [1, '#6a1424']]);
      for (let i = 0; i < 20; i++) D.clump(g, rng, rng() * W, 60 + rng() * 140, 70, 14, ['#f06070', '#d8404f'], 30, 4, 12);
      D.circleOutline(g, 480, 40, 16, '#ffe0c8', 2);
      Rig.draw(g, SKINS.oni, SKELS.oni, { armF: [-20, 0, 0], armB: [20, 0, 0] }, 480, 262, { tint: '#9a2434', scale: 1.9, alpha: 0.85 });
      g.fillStyle = '#fff4d0'; g.fillRect(480 - 20, 262 - 1.9 * 88, 11, 11); g.fillRect(480 + 12, 262 - 1.9 * 88, 11, 11);
      g.globalAlpha = 0.5; for (let i = 0; i < 6; i++) { const x = rng() * W; D.rect(g, x, 200, 8, 36, '#a82838'); D.rect(g, x - 10, 196, 28, 4, '#a82838'); } g.globalAlpha = 1;
    });
    const mid = this.layer(W, H, 62, (g, rng) => {
      for (const x of [140, 720]) { D.rect(g, x, 150, 8, 86, '#1c0a10'); D.rect(g, x + 60, 150, 8, 86, '#1c0a10'); D.rect(g, x - 14, 144, 96, 6, '#1c0a10'); D.rect(g, x - 6, 158, 80, 4, '#1c0a10'); }
      for (let i = 0; i < 10; i++) D.stalagmite(g, rng() * W, 238, 20 + rng() * 30, 30 + rng() * 60, '#2a0e16');
    });
    const near = this.layer(W, H, 63, (g, rng) => {
      for (let i = 0; i < 24; i++) D.stalagmite(g, rng() * W, 240, 10 + rng() * 20, 12 + rng() * 40, '#1c0a10');
      D.rect(g, 850, 120, 3, 120, '#1c0a10'); for (let i = 0; i < 30; i++) D.rect(g, 853 + i, 122 + (i % 4), 1, 14 - i * 0.3, '#1c0a10');
    });
    return { photo: 'bg:arena', layers: [{ c: far, s: 0.05 }, { c: mid, s: 0.3 }, { c: near, s: 0.7 }],
      ground: { top: '#2a1016', fill: '#1a0a10', dark: '#0e0508', deco: ['#5a1a22', '#ff6a5a'] },
      ambient: { colors: ['#ff9a6a', '#ffd0a0'], vy: -20, vx: 6, size: 1, n: 40 }, vignette: 0.4, gate: '#ffd0a0' };
  },
};
