// লেভেলের সব ছবি কোড দিয়ে আঁকা হয় — কোনো বাইরের ছবি লাগে না
window.Art = (function () {
  const T = 48;

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (r, arr) => arr[(r() * arr.length) | 0];

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w); c.height = Math.ceil(h);
    return c;
  }

  function rrect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  // ================= মাটি / টাইল =================
  const GRASS = ['#6c9b44', '#71a148', '#679640', '#75a44c'];

  function grass(g, x, y, r, cx, cy) {
    g.fillStyle = pick(r, GRASS);
    g.fillRect(x, y, T, T);
    if ((cx + cy) % 2 === 0) { g.fillStyle = 'rgba(255,255,200,0.035)'; g.fillRect(x, y, T, T); }
    for (let i = 0; i < 16; i++) {
      const bx = x + r() * T, by = y + r() * T, len = 3 + r() * 4, a = -Math.PI / 2 + (r() - 0.5) * 0.9;
      g.strokeStyle = r() < 0.5 ? 'rgba(52,92,30,0.55)' : 'rgba(160,205,110,0.45)';
      g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos(a) * len, by + Math.sin(a) * len); g.stroke();
    }
    if (r() < 0.12) {
      g.fillStyle = r() < 0.5 ? '#f5f0d8' : '#f3d65a';
      for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x + 6 + r() * (T - 12), y + 6 + r() * (T - 12), 1.6, 0, 7); g.fill(); }
    }
  }

  function brick(g, x, y, r) {
    g.fillStyle = '#d6ae86';
    g.fillRect(x, y, T, T);
    for (let row = 0; row < T / 8; row++) {
      const off = row % 2 ? 8 : 0;
      for (let bx = -off; bx < T; bx += 16) {
        g.fillStyle = pick(r, ['#b5643c', '#bf6e41', '#aa5b35', '#c4774a', '#b06139']);
        const x0 = Math.max(x, x + bx + 1), x1 = Math.min(x + T, x + bx + 15);
        g.fillRect(x0, y + row * 8 + 1, x1 - x0, 6);
      }
    }
    g.fillStyle = 'rgba(60,25,10,0.06)';
    for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(x + r() * T, y + r() * T, 4 + r() * 8, 0, 7); g.fill(); }
  }

  const FLOWER_SETS = [['#f5a623', '#f7c948'], ['#d93a3e', '#f06b6f'], ['#f2f0e6', '#f7e27a'], ['#e05a9c', '#f39ac6']];

  function flowerBed(g, x, y, r, cx, cy, at) {
    g.fillStyle = '#5c3a22';
    g.fillRect(x, y, T, T);
    g.fillStyle = 'rgba(140,95,60,0.35)';
    for (let i = 0; i < 18; i++) g.fillRect(x + r() * T, y + r() * T, 2, 2);
    const set = FLOWER_SETS[((cx >> 1) + (cy >> 1) * 3) % FLOWER_SETS.length];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const fx = x + 7 + i * 11 + (r() - 0.5) * 3, fy = y + 7 + j * 11 + (r() - 0.5) * 3;
      g.fillStyle = '#3f7a2c';
      g.beginPath(); g.ellipse(fx - 2, fy + 2, 3, 2, -0.5, 0, 7); g.ellipse(fx + 2, fy + 2, 3, 2, 0.5, 0, 7); g.fill();
      g.fillStyle = set[0];
      for (let k = 0; k < 5; k++) { const a = (k / 5) * 6.28; g.beginPath(); g.arc(fx + Math.cos(a) * 2.2, fy + Math.sin(a) * 2.2, 1.9, 0, 7); g.fill(); }
      g.fillStyle = set[1]; g.beginPath(); g.arc(fx, fy, 1.4, 0, 7); g.fill();
    }
    // ছাঁটা ঝোপের বেড়া
    g.fillStyle = '#3d6e2a';
    const hedge = 5;
    if (at(cx, cy - 1) !== 'f') g.fillRect(x, y, T, hedge);
    if (at(cx, cy + 1) !== 'f') g.fillRect(x, y + T - hedge, T, hedge);
    if (at(cx - 1, cy) !== 'f') g.fillRect(x, y, hedge, T);
    if (at(cx + 1, cy) !== 'f') g.fillRect(x + T - hedge, y, hedge, T);
    g.fillStyle = 'rgba(150,210,110,0.35)';
    if (at(cx, cy - 1) !== 'f') g.fillRect(x, y, T, 2);
  }

  function water(g, x, y, r, cx, cy, at) {
    const gr = g.createLinearGradient(x, y, x, y + T);
    gr.addColorStop(0, '#2f7480'); gr.addColorStop(1, '#245f6a');
    g.fillStyle = gr; g.fillRect(x, y, T, T);
    const e = 7;
    g.fillStyle = '#d2bf98';
    const wet = (t) => t === 'w' || t === 's';
    const n = !wet(at(cx, cy - 1)), s = !wet(at(cx, cy + 1)), w = !wet(at(cx - 1, cy)), ea = !wet(at(cx + 1, cy));
    if (n) g.fillRect(x, y, T, e);
    if (s) g.fillRect(x, y + T - e, T, e);
    if (w) g.fillRect(x, y, e, T);
    if (ea) g.fillRect(x + T - e, y, e, T);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    if (n) g.fillRect(x, y + e, T, 4);
    if (w) g.fillRect(x + e, y, 3, T);
    g.fillStyle = 'rgba(255,255,255,0.25)';
    if (n) g.fillRect(x, y, T, 1.5);
  }

  function channel(g, x, y, r, cx, cy, at) {
    g.fillStyle = '#d4c19b'; g.fillRect(x, y, T, T);
    g.strokeStyle = 'rgba(120,95,60,0.3)'; g.lineWidth = 1;
    for (let i = 0; i < T; i += 12) { g.beginPath(); g.moveTo(x + i, y); g.lineTo(x + i, y + T); g.stroke(); g.beginPath(); g.moveTo(x, y + i); g.lineTo(x + T, y + i); g.stroke(); }
    const v = at(cx, cy - 1) === 'c' || at(cx, cy + 1) === 'c';
    const hz = at(cx - 1, cy) === 'c' || at(cx + 1, cy) === 'c';
    const wd = 20, o = (T - wd) / 2;
    g.fillStyle = '#2f7d88';
    if (v || !hz) g.fillRect(x + o, y + (at(cx, cy - 1) === 'c' ? 0 : o), wd, T - (at(cx, cy - 1) === 'c' ? 0 : o) - (at(cx, cy + 1) === 'c' ? 0 : o));
    if (hz) g.fillRect(x + (at(cx - 1, cy) === 'c' ? 0 : o), y + o, T - (at(cx - 1, cy) === 'c' ? 0 : o) - (at(cx + 1, cy) === 'c' ? 0 : o), wd);
    g.fillStyle = 'rgba(0,0,0,0.22)';
    if (v || !hz) g.fillRect(x + o, y, 3, T);
    if (hz) g.fillRect(x, y + o, T, 3);
  }

  function wall(g, x, y, r, cx, cy, at) {
    g.fillStyle = '#86391f'; g.fillRect(x, y, T, T);
    for (let row = 0; row < T / 8; row++) {
      const off = row % 2 ? 8 : 0;
      for (let bx = -off; bx < T; bx += 16) {
        g.fillStyle = pick(r, ['#94432a', '#9c4a2c', '#8a3d24', '#a35233']);
        const x0 = Math.max(x, x + bx + 1), x1 = Math.min(x + T, x + bx + 15);
        g.fillRect(x0, y + row * 8 + 1, x1 - x0, 6);
      }
    }
    // ভেতরের দিকে মারলন (দুর্গ-প্রাচীরের খাঁজ)
    const inner = [[0, 1, 'n'], [0, -1, 's'], [1, 0, 'w'], [-1, 0, 'e']].filter(([dx, dy]) => !'#'.includes(at(cx + dx, cy + dy)) && at(cx + dx, cy + dy) !== 'X');
    for (const [dx, dy] of inner) {
      for (let i = 0; i < 3; i++) {
        const m = 10, p = 4 + i * 16;
        const mx = dx === 0 ? x + p : dx > 0 ? x + T - m - 2 : x + 2;
        const my = dy === 0 ? y + p : dy > 0 ? y + T - m - 2 : y + 2;
        g.fillStyle = '#b25a36'; g.fillRect(mx, my, m, m);
        g.fillStyle = 'rgba(255,220,180,0.25)'; g.fillRect(mx, my, m, 2);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(mx, my + m - 2, m, 2);
      }
    }
  }

  // খাল: সবুজাভ পানি, কাদা-ঘাসের পাড়, নলখাগড়া
  const isWet = (t) => t === 'k' || t === 'b' || t === 'X';
  function canal(g, x, y, r, cx, cy, at) {
    const gr = g.createLinearGradient(x, y, x + T, y + T);
    gr.addColorStop(0, '#3d6f5e'); gr.addColorStop(1, '#335f52');
    g.fillStyle = gr; g.fillRect(x, y, T, T);
    g.fillStyle = 'rgba(120,170,120,0.12)';
    for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(x + r() * T, y + r() * T, 8 + r() * 10, 3, 0, 0, 7); g.fill(); }
    if (r() < 0.18) { // কচুরিপানা
      const px = x + 8 + r() * (T - 16), py = y + 8 + r() * (T - 16);
      g.fillStyle = '#4f8a3a'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(px + (r() - 0.5) * 10, py + (r() - 0.5) * 8, 3.5, 0, 7); g.fill(); }
      g.fillStyle = '#b9a3e3'; g.beginPath(); g.arc(px, py - 2, 2, 0, 7); g.fill();
    }
    const e = 8;
    const side = (cond, fx, fy, fw, fh) => { if (!cond) return; g.fillStyle = '#6b5a3a'; g.fillRect(fx, fy, fw, fh); g.fillStyle = 'rgba(90,140,60,0.8)'; g.fillRect(fx, fy, fw, Math.min(fh, 3)); };
    side(!isWet(at(cx, cy - 1)), x, y, T, e);
    side(!isWet(at(cx, cy + 1)), x, y + T - e, T, e);
    side(!isWet(at(cx - 1, cy)), x, y, e, T);
    side(!isWet(at(cx + 1, cy)), x + T - e, y, e, T);
    if (!isWet(at(cx, cy - 1)) && r() < 0.6) { // নলখাগড়া
      g.strokeStyle = '#5f8a3a'; g.lineWidth = 1.4;
      for (let i = 0; i < 5; i++) { const bx = x + 4 + r() * (T - 8); g.beginPath(); g.moveTo(bx, y + e + 2); g.lineTo(bx + (r() - 0.5) * 6, y + e + 12 + r() * 6); g.stroke(); }
    }
  }
  function bridge(g, x, y, r, cx, cy, at) {
    canal(g, x, y, r, cx, cy, (a, b) => (at(a, b) === 'b' ? 'k' : at(a, b)));
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, y + 6, T, T - 4);
    for (let i = 0; i < 6; i++) {
      g.fillStyle = pick(r, ['#8a6236', '#7d5830', '#956b3c']);
      g.fillRect(x + i * 8 + 0.5, y + 2, 7, T - 4);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + i * 8 + 3, y + 8, 1, 2); g.fillRect(x + i * 8 + 3, y + T - 10, 1, 2);
    }
    const rail = (yy) => { g.fillStyle = '#5a3d1e'; g.fillRect(x, yy, T, 4); g.fillStyle = 'rgba(255,220,160,0.25)'; g.fillRect(x, yy, T, 1); };
    if (at(cx, cy - 1) !== 'b') rail(y);
    if (at(cx, cy + 1) !== 'b') rail(y + T - 4);
  }

  // ময়নামতি: লাল ল্যাটেরাইট মাটি, প্রাচীন ইটের মেঝে আর ভাঙা দেয়াল
  function laterite(g, x, y, r) {
    g.fillStyle = pick(r, ['#a8553a', '#b05c3e', '#a24f35']); g.fillRect(x, y, T, T);
    for (let i = 0; i < 14; i++) { g.fillStyle = r() < 0.5 ? 'rgba(80,30,15,0.35)' : 'rgba(230,160,120,0.3)'; g.beginPath(); g.arc(x + r() * T, y + r() * T, 0.8 + r() * 2, 0, 7); g.fill(); }
    if (r() < 0.3) { g.strokeStyle = 'rgba(70,25,10,0.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + r() * T, y); g.lineTo(x + r() * T, y + T); g.stroke(); }
  }
  function ruinFloor(g, x, y, r, cx, cy, at, cell) {
    g.fillStyle = cell ? '#8f4a32' : '#a35a3c'; g.fillRect(x, y, T, T);
    for (let row = 0; row < T / 12; row++) for (let col = 0; col < 2; col++) {
      if (r() < 0.12) continue; // খসে পড়া ইট
      g.fillStyle = pick(r, cell ? ['#9c5238', '#8a452f', '#a45a3e'] : ['#b8684a', '#ad5f42', '#c07352']);
      g.fillRect(x + col * 24 + 1 + (row % 2) * 6, y + row * 12 + 1, 22 - (row % 2) * 6, 10);
    }
    if (r() < 0.4) { g.fillStyle = '#5f8a3a'; for (let i = 0; i < 4; i++) { const gx = x + r() * T, gy = y + r() * T; g.fillRect(gx, gy, 1.5, 4); g.fillRect(gx + 2, gy + 1, 1.5, 3); } }
    if (cell) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, y, T, 5); }
  }
  function ruinWall(g, x, y, r, cx, cy, at) {
    g.fillStyle = '#7a3a24'; g.fillRect(x, y, T, T);
    for (let row = 0; row < T / 8; row++) {
      const off = row % 2 ? 8 : 0;
      for (let bx = -off; bx < T; bx += 16) {
        if (r() < 0.06) continue;
        g.fillStyle = pick(r, ['#b4613f', '#a95a3a', '#c06b47', '#9e5236']);
        const x0 = Math.max(x, x + bx + 1), x1 = Math.min(x + T, x + bx + 15);
        g.fillRect(x0, y + row * 8 + 1, x1 - x0, 6);
      }
    }
    g.fillStyle = 'rgba(255,220,180,0.15)'; g.fillRect(x, y, T, 3);
    // দক্ষিণ দিকে দেয়ালের উচ্চতা
    if (at(cx, cy + 1) !== 'r') {
      g.fillStyle = '#5e2a19'; g.fillRect(x, y + T - 10, T, 10);
      g.fillStyle = 'rgba(0,0,0,0.2)'; for (let k = x; k < x + T; k += 8) g.fillRect(k, y + T - 10, 1, 10);
    }
    if (r() < 0.35) { g.fillStyle = '#5f8a3a'; g.beginPath(); g.arc(x + r() * T, y + 4 + r() * 10, 3 + r() * 3, 0, 7); g.fill(); }
  }

  // সুন্দরবন: কাদামাটি (শ্বাসমূলসহ), গোলপাতার ঝোপ, জোয়ারে ডোবা কাদার চর
  function mangroveMud(g, x, y, r) {
    g.fillStyle = pick(r, ['#7a6447', '#735e42', '#80694b']); g.fillRect(x, y, T, T);
    g.fillStyle = 'rgba(30,22,12,0.35)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(x + r() * T, y + r() * T, 6 + r() * 10, 3 + r() * 4, 0, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(150,170,120,0.18)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(x + r() * T, y + r() * T, 4, 2, r(), 0, 7); g.fill(); }
    // শ্বাসমূল
    for (let i = 0; i < 7; i++) {
      const px = x + 3 + r() * (T - 6), py = y + 6 + r() * (T - 8);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(px + 1, py, 2, 2);
      g.fillStyle = '#8a7656'; g.fillRect(px, py - 6, 2, 7);
      g.fillStyle = '#a89270'; g.fillRect(px, py - 6, 2, 1.5);
    }
    if (r() < 0.25) { g.fillStyle = '#c9a442'; g.beginPath(); g.ellipse(x + r() * T, y + r() * T, 3, 1.5, r() * 3, 0, 7); g.fill(); }
  }
  function golpata(g, x, y, r) {
    mangroveMud(g, x, y, r);
    const cx = x + T / 2, cy = y + T / 2 + 6;
    for (let i = 0; i < 11; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.6, len = T * (0.42 + r() * 0.25);
      const ex = cx + Math.cos(a) * len, ey = cy + Math.sin(a) * len * 0.8;
      g.strokeStyle = i % 2 ? '#3d7a2e' : '#4f9a3a'; g.lineWidth = 4.5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo((cx + ex) / 2 + (r() - 0.5) * 8, (cy + ey) / 2 - 6, ex, ey); g.stroke();
      g.strokeStyle = 'rgba(160,210,110,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, cy); g.lineTo(ex, ey); g.stroke();
    }
  }
  function mudflat(g, x, y, r) {
    const gr = g.createLinearGradient(x, y, x + T, y + T);
    gr.addColorStop(0, '#7d6c55'); gr.addColorStop(1, '#6c5c47');
    g.fillStyle = gr; g.fillRect(x, y, T, T);
    g.fillStyle = 'rgba(200,220,230,0.18)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(x + r() * T, y + r() * T, 7 + r() * 8, 2, 0, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(30,20,10,0.55)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(x + r() * T, y + r() * T, 1.5, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(40,30,20,0.25)'; g.lineWidth = 1;
    for (let i = 0; i < 2; i++) { const px = x + r() * T, py = y + r() * T; g.beginPath(); g.moveTo(px, py); g.lineTo(px + 3, py - 2); g.moveTo(px, py); g.lineTo(px - 3, py - 2); g.moveTo(px, py); g.lineTo(px, py - 4); g.stroke(); }
  }

  // খোদাই করা পাথরের চিহ্ন (পাথর বসানোর জায়গা)
  function plate(g, x, y, r, cx, cy, at) {
    ruinFloor(g, x, y, r, cx, cy, at);
    const m = T / 2;
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(x + m, y + m + 1, 17, 0, 7); g.fill();
    g.fillStyle = '#b9b2a2'; g.beginPath(); g.arc(x + m, y + m, 16, 0, 7); g.fill();
    g.strokeStyle = '#6e665a'; g.lineWidth = 2; g.beginPath(); g.arc(x + m, y + m, 11, 0, 7); g.stroke();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.beginPath(); g.moveTo(x + m + Math.cos(a) * 4, y + m + Math.sin(a) * 4); g.lineTo(x + m + Math.cos(a) * 10, y + m + Math.sin(a) * 10); g.stroke(); }
  }

  // দিঘির পানিতে পা রাখার পাথর
  function stone(g, x, y, r, cx, cy, at) {
    water(g, x, y, r, cx, cy, (a, b) => (at(a, b) === 's' ? 'w' : at(a, b)));
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x + T / 2 + 3, y + T / 2 + 5, 17, 13, 0, 0, 7); g.fill();
    const sg = g.createRadialGradient(x + T / 2 - 5, y + T / 2 - 6, 2, x + T / 2, y + T / 2, 19);
    sg.addColorStop(0, '#d8d2c2'); sg.addColorStop(1, '#8c867a');
    g.fillStyle = sg; g.beginPath(); g.ellipse(x + T / 2, y + T / 2, 17 + r() * 2, 13 + r() * 2, r() * 0.6, 0, 7); g.fill();
    g.fillStyle = 'rgba(90,120,70,0.5)'; g.beginPath(); g.arc(x + T / 2 + 6, y + T / 2 + 5, 4, 0, 7); g.fill();
  }

  function ground(tiles, C, R) {
    const c = canvas(C * T, R * T);
    const g = c.getContext('2d');
    const at = (x, y) => (x < 0 || y < 0 || x >= C || y >= R ? 'X' : tiles[y][x]);
    const draw = { g: grass, p: brick, G: brick, f: flowerBed, w: water, c: channel, '#': wall, k: canal, b: bridge,
      q: plate, s: stone, u: mangroveMud, h: golpata, z: mudflat, l: laterite, m: ruinFloor, n: (g2, x, y, r, cx, cy, a) => ruinFloor(g2, x, y, r, cx, cy, a, true), r: ruinWall };
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
      const t = at(x, y);
      (draw[t] || grass)(g, x * T, y * T, rng(x * 7919 + y * 104729 + 13), x, y, at);
    }
    // প্রাচীরের ছায়া মাটিতে
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
      if (at(x, y) !== '#') continue;
      if (at(x, y + 1) !== '#' && at(x, y + 1) !== 'X') {
        const gr = g.createLinearGradient(0, (y + 1) * T, 0, (y + 1) * T + 14);
        gr.addColorStop(0, 'rgba(20,10,0,0.35)'); gr.addColorStop(1, 'rgba(20,10,0,0)');
        g.fillStyle = gr; g.fillRect(x * T, (y + 1) * T, T, 14);
      }
      if (at(x + 1, y) !== '#' && at(x + 1, y) !== 'X') {
        const gr = g.createLinearGradient((x + 1) * T, 0, (x + 1) * T + 10, 0);
        gr.addColorStop(0, 'rgba(20,10,0,0.3)'); gr.addColorStop(1, 'rgba(20,10,0,0)');
        g.fillStyle = gr; g.fillRect((x + 1) * T, y * T, 10, T);
      }
    }
    return c;
  }

  // ================= গাছ =================
  function treeSprite(kind, seed) {
    const r = rng(seed);
    const c = canvas(T * 2, T * 2.5);
    const g = c.getContext('2d');
    const ax = T, ay = c.height - 10;
    g.fillStyle = 'rgba(15,30,5,0.3)';
    g.beginPath(); g.ellipse(ax + 8, ay - 4, T * 0.55, T * 0.2, 0, 0, 7); g.fill();
    if (kind === 'mangrove' || kind === 'keora') { // সুন্দরী/কেওড়া: ঠেসমূল আর ঘন পাতা
      const keora = kind === 'keora';
      g.strokeStyle = '#4a3a2a'; g.lineWidth = 2.5;
      for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(ax + i * 2, ay - 22); g.quadraticCurveTo(ax + i * 6, ay - 12, ax + i * 7, ay - 2); g.stroke(); }
      g.fillStyle = '#5a4434'; g.fillRect(ax - 4, ay - (keora ? T * 1.05 : T * 0.85), 8, keora ? T * 0.85 : T * 0.65);
      const cy = ay - (keora ? T * 1.25 : T * 1.0);
      const pal = keora ? ['#2e5e3a', '#3f7a48', '#6aa36a', '#a8d0a0'] : ['#1f4a26', '#2c6532', '#4a8a40', '#7ab35e'];
      const blobs = [];
      for (let i = 0; i < 10; i++) blobs.push([ax + (r() - 0.5) * T * (keora ? 0.6 : 0.85), cy + (r() - 0.5) * T * 0.5, T * (0.2 + r() * 0.12)]);
      g.fillStyle = pal[0]; blobs.forEach(([x2, y2, rr]) => { g.beginPath(); g.arc(x2 + 2, y2 + 3, rr, 0, 7); g.fill(); });
      g.fillStyle = pal[1]; blobs.forEach(([x2, y2, rr]) => { g.beginPath(); g.arc(x2, y2, rr * 0.9, 0, 7); g.fill(); });
      g.fillStyle = pal[2]; blobs.forEach(([x2, y2, rr]) => { g.beginPath(); g.arc(x2 - rr * 0.3, y2 - rr * 0.3, rr * 0.5, 0, 7); g.fill(); });
      if (keora) { g.strokeStyle = 'rgba(210,235,200,0.45)'; g.lineWidth = 1; for (let i = 0; i < 4; i++) { const sx = ax + (r() - 0.5) * T * 0.6; g.beginPath(); g.moveTo(sx, cy - 6); g.lineTo(sx + (r() - 0.5) * 4, cy + 14); g.stroke(); } }
    } else if (kind === 'sal') { // শালগাছ: লম্বা সোজা গুঁড়ি, উঁচু ঘন পাতা
      g.fillStyle = '#5a4030'; g.fillRect(ax - 4, ay - T * 1.1, 8, T * 1.1 - 2);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(ax + 1, ay - T * 1.1, 3, T * 1.1 - 2);
      const cy = ay - T * 1.45;
      const pal = ['#1f4d22', '#2b6a2c', '#418a3a', '#6aac4f'];
      for (let layer = 0; layer < 4; layer++) {
        g.fillStyle = pal[layer];
        for (let i = 0; i < 6 - layer; i++) {
          const bx = ax + (r() - 0.5) * T * (0.7 - layer * 0.12), by = cy + (r() - 0.5) * T * 0.7 - layer * 4;
          g.beginPath(); g.ellipse(bx - layer * 2, by - layer * 2, T * (0.22 - layer * 0.03), T * (0.3 - layer * 0.04), 0, 0, 7); g.fill();
        }
      }
    } else if (kind === 'palm') {
      g.strokeStyle = '#7b5b3a'; g.lineWidth = 6; g.lineCap = 'round';
      const lean = (r() - 0.5) * 14;
      g.beginPath(); g.moveTo(ax, ay - 4); g.quadraticCurveTo(ax + lean * 0.3, ay - T, ax + lean, ay - T * 1.75); g.stroke();
      g.strokeStyle = 'rgba(60,40,20,0.5)'; g.lineWidth = 1.5;
      for (let i = 1; i < 9; i++) {
        const t = i / 9, px = ax + lean * t * t, py = ay - 4 - (T * 1.71) * t;
        g.beginPath(); g.moveTo(px - 3, py); g.lineTo(px + 3, py); g.stroke();
      }
      const hx = ax + lean, hy = ay - T * 1.75;
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + r() * 0.3, len = T * (0.55 + r() * 0.2);
        const ex = hx + Math.cos(a) * len, ey = hy + Math.sin(a) * len * 0.6 + 8;
        g.strokeStyle = i % 2 ? '#3f7d2e' : '#58a03c'; g.lineWidth = 5;
        g.beginPath(); g.moveTo(hx, hy); g.quadraticCurveTo((hx + ex) / 2, hy - 10, ex, ey); g.stroke();
      }
      g.fillStyle = '#7a5a2a'; g.beginPath(); g.arc(hx, hy, 4, 0, 7); g.fill();
    } else {
      const pal = kind === 'light' ? ['#3d7a2a', '#579a37', '#7fc057', '#a6d97a'] : ['#245c27', '#2f7431', '#4b9440', '#74b85e'];
      g.fillStyle = '#6b4a2c'; g.fillRect(ax - 4, ay - 26, 8, 24);
      const cy = ay - T * 0.95;
      const blobs = [];
      for (let i = 0; i < 9; i++) blobs.push([ax + (r() - 0.5) * T * 0.75, cy + (r() - 0.5) * T * 0.55, T * (0.26 + r() * 0.14)]);
      g.fillStyle = pal[0]; blobs.forEach(([x, y, rr]) => { g.beginPath(); g.arc(x + 2, y + 4, rr, 0, 7); g.fill(); });
      g.fillStyle = pal[1]; blobs.forEach(([x, y, rr]) => { g.beginPath(); g.arc(x, y, rr * 0.92, 0, 7); g.fill(); });
      g.fillStyle = pal[2]; blobs.forEach(([x, y, rr]) => { g.beginPath(); g.arc(x - rr * 0.25, y - rr * 0.3, rr * 0.55, 0, 7); g.fill(); });
      g.fillStyle = pal[3]; blobs.slice(0, 5).forEach(([x, y, rr]) => { g.beginPath(); g.arc(x - rr * 0.38, y - rr * 0.45, rr * 0.22, 0, 7); g.fill(); });
      if (kind !== 'light' && r() < 0.6) { // আমের মুকুল/ফল
        g.fillStyle = '#e8b33a';
        for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(ax + (r() - 0.5) * T * 0.7, cy + (r() - 0.2) * T * 0.4, 2.4, 0, 7); g.fill(); }
      }
    }
    return { img: c, ax, ay };
  }

  // ================= দালান =================
  function shadowRect(g, x, y, w, h) {
    g.save();
    g.fillStyle = 'rgba(20,10,0,0.28)';
    g.beginPath(); g.moveTo(x + w, y + 10); g.lineTo(x + w + 16, y + 22); g.lineTo(x + w + 16, y + h + 12); g.lineTo(x + 14, y + h + 12); g.lineTo(x, y + h); g.lineTo(x + w, y + h); g.closePath(); g.fill();
    g.restore();
  }

  function arches(g, x, y, w, h, n, opts = {}) {
    const gap = w / n;
    for (let i = 0; i < n; i++) {
      const big = opts.bigCenter && i === (n - 1) / 2;
      const aw = gap * (big ? 0.72 : 0.56), ah = h * (big ? 0.86 : 0.72);
      const ax = x + gap * i + (gap - aw) / 2, ay = y + h - ah;
      g.fillStyle = opts.frame || 'rgba(255,255,255,0.35)';
      g.beginPath(); g.moveTo(ax - 3, y + h); g.lineTo(ax - 3, ay + aw / 2); g.quadraticCurveTo(ax + aw / 2, ay - aw * 0.55, ax + aw + 3, ay + aw / 2); g.lineTo(ax + aw + 3, y + h); g.fill();
      const gr = g.createLinearGradient(0, ay, 0, y + h);
      gr.addColorStop(0, '#2a1d14'); gr.addColorStop(1, '#4a3424');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(ax, y + h); g.lineTo(ax, ay + aw / 2); g.quadraticCurveTo(ax + aw / 2, ay - aw * 0.42, ax + aw, ay + aw / 2); g.lineTo(ax + aw, y + h); g.fill();
    }
  }

  function dome(g, cx, by, r, cols) {
    g.fillStyle = cols[2];
    g.fillRect(cx - r * 0.82, by - r * 0.32, r * 1.64, r * 0.36);
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(cx - r * 0.82, by - r * 0.04, r * 1.64, 3);
    const top = by - r * 0.3;
    const gr = g.createLinearGradient(cx - r, 0, cx + r, 0);
    gr.addColorStop(0, cols[0]); gr.addColorStop(0.45, cols[1]); gr.addColorStop(1, cols[2]);
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(cx - r * 0.9, top);
    g.bezierCurveTo(cx - r * 1.05, top - r * 0.9, cx - r * 0.25, top - r * 1.2, cx, top - r * 1.45);
    g.bezierCurveTo(cx + r * 0.25, top - r * 1.2, cx + r * 1.05, top - r * 0.9, cx + r * 0.9, top);
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(cx + i * r * 0.3, top); g.quadraticCurveTo(cx + i * r * 0.22, top - r * 0.9, cx, top - r * 1.45); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath(); g.ellipse(cx - r * 0.38, top - r * 0.6, r * 0.14, r * 0.35, -0.3, 0, 7); g.fill();
    g.strokeStyle = cols[3] || '#b8892a'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx, top - r * 1.45); g.lineTo(cx, top - r * 1.45 - 10); g.stroke();
    g.fillStyle = cols[3] || '#e2b84a'; g.beginPath(); g.arc(cx, top - r * 1.45 - 6, 2.4, 0, 7); g.fill();
  }

  function block(g, x, y, w, h, o) {
    const fh = o.facadeH, rh = h - fh;
    shadowRect(g, x, y, w, h);
    g.fillStyle = o.plinth || '#b9a888'; g.fillRect(x - 5, y + h - 6, w + 10, 8);
    g.fillStyle = o.roof; g.fillRect(x, y, w, rh);
    g.strokeStyle = o.parapet || 'rgba(255,255,255,0.5)'; g.lineWidth = 5; g.strokeRect(x + 2.5, y + 2.5, w - 5, rh - 5);
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1; g.strokeRect(x + 6, y + 6, w - 12, rh - 12);
    const gr = g.createLinearGradient(0, y + rh, 0, y + h);
    gr.addColorStop(0, o.facade[0]); gr.addColorStop(1, o.facade[1]);
    g.fillStyle = gr; g.fillRect(x, y + rh, w, fh);
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, y + rh, w, 3);
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(x, y + rh + 3, w, 3);
    g.fillStyle = 'rgba(0,0,0,0.1)'; g.fillRect(x + w - 6, y + rh, 6, fh);
    return { roofBottom: y + rh };
  }

  function turret(g, cx, by, r, col, domeCols) {
    g.fillStyle = col; g.fillRect(cx - r, by - r * 2.2, r * 2, r * 2.2);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(cx + r * 0.4, by - r * 2.2, r * 0.6, r * 2.2);
    dome(g, cx, by - r * 2.0, r * 1.15, domeCols);
  }

  const BRONZE = ['#f3d07a', '#c99232', '#7e5414', '#e9be55'];
  const PLASTER = ['#fffaf0', '#ece2cc', '#bfb194', '#d9b456'];

  // পানাম নগরের ঔপনিবেশিক দোতলা বণিক-বাড়ি
  const PANAM_COLORS = [['#dcb48a', '#c39a70'], ['#e2b2a3', '#c9978a'], ['#cfd9c3', '#b2bfa5'], ['#ebe2cf', '#d0c6b0'], ['#d9c27e', '#bfa865'], ['#c7cfdc', '#aab3c2']];
  function panamHouse(g, x, y, w, h, seed, back, special) {
    const r = rng(seed * 977 + 5);
    const [wall, wallD] = special ? ['#eef0f2', '#cfd6dd'] : PANAM_COLORS[seed % PANAM_COLORS.length];
    const fh = back ? T * 1.35 : T * 2.35, rh = h - fh;
    shadowRect(g, x, y, w, h);
    // ছাদ
    g.fillStyle = wallD; g.fillRect(x, y, w, rh);
    g.fillStyle = 'rgba(80,60,40,0.18)';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(x + r() * w, y + r() * rh, 10 + r() * 20, 5 + r() * 8, 0, 0, 7); g.fill(); }
    // কার্নিশের রেলিং (বালুস্টার)
    g.fillStyle = wall; g.fillRect(x, y, w, 6); g.fillRect(x, y, 6, rh); g.fillRect(x + w - 6, y, 6, rh); g.fillRect(x, y + rh - 6, w, 6);
    g.fillStyle = 'rgba(0,0,0,0.18)';
    for (let i = x + 8; i < x + w - 8; i += 9) if (r() > 0.12) g.fillRect(i, y + rh - 5, 3, 4);
    // ছাদে গজানো গাছ (পুরনো বাড়ির চিহ্ন)
    const plants = 1 + ((r() * 3) | 0);
    for (let i = 0; i < plants; i++) {
      const px = x + 10 + r() * (w - 20), py = y + 4 + r() * (rh - 8);
      g.fillStyle = '#4f7f35'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(px + (r() - 0.5) * 14, py + (r() - 0.5) * 8, 4 + r() * 3, 0, 7); g.fill(); }
      g.fillStyle = '#76a84a'; g.beginPath(); g.arc(px - 2, py - 2, 3, 0, 7); g.fill();
    }
    if (back && r() < 0.75) { // চিলেকোঠা (ছাদের সিঁড়িঘর)
      const cw = 34 + r() * 14, ch = 26, cx = x + 14 + r() * (w - cw - 28), cy = y + 12 + r() * Math.max(0, rh - ch - 34);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(cx + 6, cy + 6, cw, ch + 8);
      g.fillStyle = wallD; g.fillRect(cx, cy, cw, ch);
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(cx, cy, cw, 4);
      g.fillStyle = wall; g.fillRect(cx, cy + ch, cw, 12);
      g.fillStyle = '#4a3020'; g.fillRect(cx + cw / 2 - 5, cy + ch + 1, 10, 11);
    }
    if (back) { // ছাদে কাপড় শুকানোর দড়ি
      const ly = y + rh * 0.35 + r() * rh * 0.3;
      g.strokeStyle = 'rgba(60,50,40,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 10, ly); g.lineTo(x + w - 10, ly + 4); g.stroke();
      const cl = ['#c0392b', '#2a6fb0', '#f1c40f', '#ecf0f1', '#27ae60'];
      for (let i = 0; i < 4; i++) { const cx = x + 20 + r() * (w - 40); g.fillStyle = cl[(r() * cl.length) | 0]; g.fillRect(cx, ly + (cx - x) / w * 4, 9, 12); }
    }
    if (special) { // নাচঘরের ছাদে ছত্রী
      const cx = x + w / 2, cy = y + rh / 2 + 10;
      g.fillStyle = '#e9edf0'; g.fillRect(cx - 14, cy - 18, 28, 18);
      dome(g, cx, cy - 16, 16, PLASTER);
    }
    // সামনের দেয়াল
    const fy = y + rh;
    const gr = g.createLinearGradient(0, fy, 0, fy + fh);
    gr.addColorStop(0, wall); gr.addColorStop(1, wallD);
    g.fillStyle = gr; g.fillRect(x, fy, w, fh);
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(x, fy, w, 3);
    // পুরনো দাগ আর শ্যাওলা
    for (let i = 0; i < 5; i++) {
      const sx = x + r() * w, sl = 12 + r() * fh * 0.5;
      const sg = g.createLinearGradient(0, fy, 0, fy + sl);
      sg.addColorStop(0, 'rgba(50,40,30,0.25)'); sg.addColorStop(1, 'rgba(50,40,30,0)');
      g.fillStyle = sg; g.fillRect(sx, fy, 4 + r() * 6, sl);
    }
    const mg = g.createLinearGradient(0, fy + fh - 14, 0, fy + fh);
    mg.addColorStop(0, 'rgba(70,110,50,0)'); mg.addColorStop(1, 'rgba(70,110,50,0.45)');
    g.fillStyle = mg; g.fillRect(x, fy + fh - 14, w, 14);
    g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(x + w - 6, fy, 6, fh);

    if (back) { // পেছনের দেয়াল: ছোট জানালা, পানির নল
      const n = Math.max(2, Math.round(w / 50));
      for (let i = 0; i < n; i++) {
        const wx = x + (w / n) * (i + 0.5) - 8, wy = fy + 12;
        g.fillStyle = '#3a2a1e'; g.fillRect(wx, wy, 16, 18);
        g.fillStyle = '#4f7f6a'; g.fillRect(wx, wy, 7, 18); g.fillRect(wx + 9, wy, 7, 18);
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(wx + 1, wy + 2, 5, 1); g.fillRect(wx + 1, wy + 8, 5, 1); g.fillRect(wx + 10, wy + 5, 5, 1);
      }
      g.fillStyle = '#6a6a6a'; g.fillRect(x + w - 16, fy + 2, 4, fh - 4);
      return;
    }
    // উপরতলা: খিলান জানালা, সবুজ খড়খড়ি, লোহার রেলিং
    const up = fy + 8, upH = fh * 0.46;
    const cols = Math.max(3, Math.round(w / 38));
    const step = w / cols;
    for (let i = 0; i < cols; i++) {
      const wx = x + step * i + step * 0.22, ww = step * 0.56, wy = up + 6, wh = upH - 12;
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.beginPath(); g.moveTo(wx - 3, wy + wh); g.lineTo(wx - 3, wy + ww / 2); g.arc(wx + ww / 2, wy + ww / 2, ww / 2 + 3, Math.PI, 0); g.lineTo(wx + ww + 3, wy + wh); g.fill();
      const broken = r() < 0.18;
      g.fillStyle = broken ? '#2a1d14' : '#4f7f6a';
      g.beginPath(); g.moveTo(wx, wy + wh); g.lineTo(wx, wy + ww / 2); g.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); g.lineTo(wx + ww, wy + wh); g.fill();
      if (!broken) {
        g.strokeStyle = 'rgba(20,40,30,0.5)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(wx + ww / 2, wy + 2); g.lineTo(wx + ww / 2, wy + wh); g.stroke();
        for (let k = wy + ww / 2 + 2; k < wy + wh; k += 3.5) { g.beginPath(); g.moveTo(wx + 2, k); g.lineTo(wx + ww - 2, k); g.stroke(); }
      }
      // পিলাস্টার
      g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(x + step * i - 2, up, 4, upH);
    }
    // বারান্দার লোহার রেলিং
    const ry = up + upH - 10;
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(x + 4, ry + 10, w - 8, 3);
    g.strokeStyle = '#2b2b2b'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x + 4, ry); g.lineTo(x + w - 4, ry); g.moveTo(x + 4, ry + 9); g.lineTo(x + w - 4, ry + 9); g.stroke();
    for (let k = x + 6; k < x + w - 4; k += 6) { g.beginPath(); g.moveTo(k, ry); g.lineTo(k, ry + 9); g.stroke(); g.beginPath(); g.arc(k + 3, ry + 4.5, 2, 0, 7); g.stroke(); }
    // কার্নিশ
    const cy = up + upH;
    g.fillStyle = wall; g.fillRect(x - 3, cy, w + 6, 6);
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x - 3, cy + 6, w + 6, 2);
    for (let k = x; k < x + w; k += 6) { g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(k, cy + 1, 3, 3); }
    // নিচতলা: স্তম্ভ, খিলান আর মাঝের দরজা
    const gy = cy + 8, gh = fy + fh - gy - 4;
    for (let i = 0; i < cols; i++) {
      const ax = x + step * i + step * 0.15, aw = step * 0.7;
      const isDoor = i === Math.floor(cols / 2);
      g.fillStyle = '#2f2219';
      g.beginPath(); g.moveTo(ax, gy + gh); g.lineTo(ax, gy + aw / 2); g.arc(ax + aw / 2, gy + aw / 2, aw / 2, Math.PI, 0); g.lineTo(ax + aw, gy + gh); g.fill();
      if (isDoor) {
        g.fillStyle = '#6b4226'; g.fillRect(ax + 3, gy + aw / 2, aw - 6, gh - aw / 2);
        g.strokeStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.moveTo(ax + aw / 2, gy + aw / 2); g.lineTo(ax + aw / 2, gy + gh); g.stroke();
        g.fillStyle = '#d9a441'; g.beginPath(); g.arc(ax + aw / 2 - 4, gy + gh * 0.6, 1.6, 0, 7); g.arc(ax + aw / 2 + 4, gy + gh * 0.6, 1.6, 0, 7); g.fill();
      } else {
        g.fillStyle = 'rgba(79,127,106,0.7)'; g.fillRect(ax + 4, gy + aw / 2 + 4, aw - 8, gh - aw / 2 - 8);
      }
      g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(x + step * i - 3, gy, 6, gh);
    }
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(x + w - 3, gy, 3, gh);
    // ফলক (সাল লেখা)
    const px = x + w / 2;
    g.fillStyle = wall; g.beginPath(); g.moveTo(px - 26, fy + 2); g.quadraticCurveTo(px, fy - 18, px + 26, fy + 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(px - 14, fy - 6, 28, 9);
    g.fillStyle = 'rgba(60,40,20,0.6)'; g.fillRect(px - 10, fy - 3, 20, 2);
    g.fillStyle = 'rgba(40,30,20,0.22)'; g.fillRect(x, fy + fh - 3, w, 3);
  }

  function building(kind, wT, hT, seed = 1) {
    const w = wT * T, h = hT * T, top = T * 1.9, pad = 14;
    const c = canvas(w + 30, h + top + 10);
    const g = c.getContext('2d');
    const x = 6, y = top, iw = w - 12, ih = h - 6;
    if (kind === 'tower') { // বনের ওয়াচটাওয়ার
      const bx = x + 10, bw = iw - 20, base = y + ih - 4, topY = y - T * 1.4;
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x + iw / 2 + 18, base, iw * 0.55, 12, 0, 0, 7); g.fill();
      g.strokeStyle = '#6b4a2a'; g.lineWidth = 6;
      for (const lx of [bx, bx + bw]) { g.beginPath(); g.moveTo(lx, base); g.lineTo(lx + (lx === bx ? 10 : -10), topY + 30); g.stroke(); }
      g.strokeStyle = '#7d5834'; g.lineWidth = 2.5;
      for (let k = 0; k < 4; k++) { const yy = base - k * ((base - topY - 30) / 4); g.beginPath(); g.moveTo(bx + k * 2.5, yy); g.lineTo(bx + bw - k * 2.5, yy - 26); g.moveTo(bx + bw - k * 2.5, yy); g.lineTo(bx + k * 2.5, yy - 26); g.stroke(); }
      // মই
      g.strokeStyle = '#a07a48'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x + iw / 2 - 7, base); g.lineTo(x + iw / 2 - 7, topY + 34); g.moveTo(x + iw / 2 + 7, base); g.lineTo(x + iw / 2 + 7, topY + 34); g.stroke();
      for (let yy = base - 8; yy > topY + 36; yy -= 9) { g.beginPath(); g.moveTo(x + iw / 2 - 7, yy); g.lineTo(x + iw / 2 + 7, yy); g.stroke(); }
      // মঞ্চ ও ছাদ
      g.fillStyle = '#8a6236'; g.fillRect(bx - 4, topY + 22, bw + 8, 10);
      g.strokeStyle = '#5a3d1e'; g.lineWidth = 2; for (let k = bx - 2; k < bx + bw + 4; k += 8) { g.beginPath(); g.moveTo(k, topY + 22); g.lineTo(k, topY + 6); g.stroke(); }
      g.beginPath(); g.moveTo(bx - 4, topY + 8); g.lineTo(bx + bw + 4, topY + 8); g.stroke();
      g.fillStyle = '#3f6b4a'; g.beginPath(); g.moveTo(bx - 10, topY + 4); g.lineTo(x + iw / 2, topY - 20); g.lineTo(bx + bw + 10, topY + 4); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(bx - 10, topY + 4); g.lineTo(x + iw / 2, topY - 20); g.lineTo(x + iw / 2, topY + 4); g.fill();
    } else if (kind === 'shatgombuj') { // ষাট গম্বুজ মসজিদ: ৭×১১ = ৭৭ ছাদ-গম্বুজ (মাঝের সারিতে ৭টা চৌচালা) + চার কোণের মিনারে ৪টা
      const tr = T * 0.55, fh = T * 1.8;
      const bx = x + tr * 0.6, by = y + tr * 0.6, bw = iw - tr * 1.2, bh = ih - tr * 0.6;
      const rb = by + bh - fh;
      shadowRect(g, bx, by, bw, bh);
      // ছাদ
      const rg = g.createLinearGradient(0, by, 0, rb);
      rg.addColorStop(0, '#b47a55'); rg.addColorStop(1, '#a06a48');
      g.fillStyle = rg; g.fillRect(bx, by, bw, rb - by + 8);
      g.strokeStyle = '#c99470'; g.lineWidth = 5; g.strokeRect(bx + 2.5, by + 2.5, bw - 5, rb - by);
      const m = 12, cols = 7, rows = 11;
      const cw = (bw - 2 * m) / cols, ch = (rb - by - 2 * m) / rows;
      const rr = Math.min(cw, ch) * 0.42;
      for (let rI = 0; rI < rows; rI++) for (let cI = 0; cI < cols; cI++) {
        const cx = bx + m + cw * (cI + 0.5), cy = by + m + ch * (rI + 0.5);
        g.fillStyle = 'rgba(40,15,5,0.3)'; g.beginPath(); g.ellipse(cx + 3, cy + 4, rr, rr * 0.8, 0, 0, 7); g.fill();
        if (rI === 5) { // চৌচালা ছাদ
          const s = rr * 1.05;
          g.fillStyle = '#a65e3a'; g.beginPath(); g.moveTo(cx - s, cy - s * 0.8); g.lineTo(cx + s, cy - s * 0.8); g.lineTo(cx, cy); g.fill();
          g.fillStyle = '#c47a52'; g.beginPath(); g.moveTo(cx - s, cy - s * 0.8); g.lineTo(cx - s, cy + s * 0.8); g.lineTo(cx, cy); g.fill();
          g.fillStyle = '#7e4428'; g.beginPath(); g.moveTo(cx + s, cy - s * 0.8); g.lineTo(cx + s, cy + s * 0.8); g.lineTo(cx, cy); g.fill();
          g.fillStyle = '#8f4f30'; g.beginPath(); g.moveTo(cx - s, cy + s * 0.8); g.lineTo(cx + s, cy + s * 0.8); g.lineTo(cx, cy); g.fill();
          g.fillStyle = '#e2b88e'; g.beginPath(); g.arc(cx, cy, 1.8, 0, 7); g.fill();
        } else {
          const dg = g.createRadialGradient(cx - rr * 0.35, cy - rr * 0.45, 1, cx, cy, rr * 1.1);
          dg.addColorStop(0, '#e2b490'); dg.addColorStop(0.55, '#a8633e'); dg.addColorStop(1, '#6e3a22');
          g.fillStyle = dg; g.beginPath(); g.ellipse(cx, cy, rr, rr * 0.85, 0, 0, 7); g.fill();
          g.fillStyle = '#5a2e18'; g.beginPath(); g.arc(cx, cy - rr * 0.1, 1.6, 0, 7); g.fill();
        }
      }
      // সামনের দেয়াল (বাংলার বাঁকা কার্নিশসহ)
      const fy = rb + 4;
      const fg = g.createLinearGradient(0, fy, 0, fy + fh);
      fg.addColorStop(0, '#b55e38'); fg.addColorStop(1, '#8e4426');
      g.fillStyle = fg;
      g.beginPath(); g.moveTo(bx, fy + 6); g.quadraticCurveTo(bx + bw / 2, fy - 14, bx + bw, fy + 6); g.lineTo(bx + bw, fy + fh); g.lineTo(bx, fy + fh); g.fill();
      g.strokeStyle = '#d98c5f'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(bx, fy + 6); g.quadraticCurveTo(bx + bw / 2, fy - 14, bx + bw, fy + 6); g.stroke();
      g.strokeStyle = 'rgba(255,200,160,0.35)'; g.lineWidth = 1.5;
      for (let k = 1; k <= 2; k++) { g.beginPath(); g.moveTo(bx, fy + 6 + k * 7); g.quadraticCurveTo(bx + bw / 2, fy - 14 + k * 7, bx + bw, fy + 6 + k * 7); g.stroke(); }
      arches(g, bx + 10, fy + 22, bw - 20, fh - 24, 7, { bigCenter: true, frame: 'rgba(240,190,150,0.45)' });
      g.fillStyle = 'rgba(255,210,170,0.3)'; for (let k = bx + 8; k < bx + bw - 8; k += 10) g.fillRect(k, fy + fh - 7, 6, 3);
      // চার কোণের গোল মিনার
      const tower = (cx, cy, full) => {
        if (full) {
          const tg = g.createLinearGradient(cx - tr, 0, cx + tr, 0);
          tg.addColorStop(0, '#c06a42'); tg.addColorStop(0.5, '#a5532f'); tg.addColorStop(1, '#6e3420');
          g.fillStyle = tg; g.fillRect(cx - tr, cy, tr * 2, fh + 6);
          g.strokeStyle = 'rgba(60,20,8,0.45)'; g.lineWidth = 1.5;
          for (let k = cy + 10; k < cy + fh; k += 12) { g.beginPath(); g.moveTo(cx - tr, k); g.lineTo(cx + tr, k); g.stroke(); }
        }
        g.fillStyle = '#b8653e'; g.beginPath(); g.ellipse(cx, cy, tr, tr * 0.8, 0, 0, 7); g.fill();
        g.strokeStyle = '#d98c5f'; g.lineWidth = 2; g.stroke();
        dome(g, cx, cy + 2, tr * 0.62, ['#e2b490', '#a8633e', '#6e3a22', '#c9a463']);
      };
      tower(bx, by, false); tower(bx + bw, by, false);
      tower(bx, fy - 2, true); tower(bx + bw, fy - 2, true);
    } else if (kind === 'singledome') { // খান জাহান আলীর মাজারের মতো এক গম্বুজের দালান
      const bx = x + 8, by = y + 10, bw = iw - 16, bh = ih - 10;
      const { roofBottom } = block(g, bx, by, bw, bh, { facadeH: T * 1.3, roof: '#b7805c', facade: ['#c2683f', '#94482a'], parapet: 'rgba(230,170,130,0.6)', plinth: '#a89070' });
      arches(g, bx + 14, roofBottom + 8, bw - 28, T * 1.3 - 8, 1, { bigCenter: true });
      dome(g, bx + bw / 2, by + (roofBottom - by) / 2 + 22, Math.min(bw, roofBottom - by) * 0.42, ['#f0e8d8', '#d8ccb4', '#a89a80', '#d9b456']);
    } else if (kind === 'shrine') { // শালবন বিহারের ক্রুশাকৃতি কেন্দ্রীয় মন্দিরের ধ্বংসাবশেষ
      const r = rng(seed * 31 + 7);
      const cx = x + iw / 2, cy = y + ih / 2 + 4;
      const tiers = [[iw * 0.5, iw * 0.2, 16], [iw * 0.36, iw * 0.15, 14], [iw * 0.22, iw * 0.1, 12]];
      g.fillStyle = 'rgba(20,10,0,0.3)';
      g.fillRect(cx - tiers[0][1] + 14, cy - tiers[0][0] + 14, tiers[0][1] * 2, tiers[0][0] * 2);
      g.fillRect(cx - tiers[0][0] + 14, cy - tiers[0][1] + 14, tiers[0][0] * 2, tiers[0][1] * 2);
      tiers.forEach(([arm, half, hgt], ti) => {
        const lift = ti * 14;
        const cross = (dx, dy, col) => {
          g.fillStyle = col;
          g.fillRect(cx - half + dx, cy - arm - lift + dy, half * 2, arm * 2);
          g.fillRect(cx - arm + dx, cy - half - lift + dy, arm * 2, half * 2);
        };
        cross(0, hgt, '#6e301c'); // দেয়ালের গা (উচ্চতা)
        cross(0, 0, ['#b8644a', '#c06c50', '#c87656'][ti]);
        // ইটের রেখা
        g.strokeStyle = 'rgba(80,30,15,0.25)'; g.lineWidth = 1;
        for (let yy = cy - arm - lift + 6; yy < cy + arm - lift; yy += 7) { g.beginPath(); g.moveTo(cx - half, yy); g.lineTo(cx + half, yy); g.stroke(); }
        // পোড়ামাটির ফলকের সারি (নিচের তাকে)
        if (ti === 0) {
          for (let k = cx - arm + 6; k < cx + arm - 8; k += 12) {
            if (k > cx - half - 2 && k < cx + half - 8) continue;
            g.fillStyle = '#d98c5f'; g.fillRect(k, cy + half - lift + 3, 9, 9);
            g.fillStyle = 'rgba(80,30,10,0.45)'; g.beginPath(); g.arc(k + 4.5, cy + half - lift + 7.5, 2.5, 0, 7); g.fill();
          }
          for (let k = cy + half + 4; k < cy + arm - 4; k += 12) {
            g.fillStyle = '#d98c5f'; g.fillRect(cx - half + 3, k, 9, 9); g.fillRect(cx + half - 12, k, 9, 9);
          }
        }
        // ঘাস আর ভাঙা কোণ
        for (let i = 0; i < 4; i++) { g.fillStyle = '#5f8a3a'; g.beginPath(); g.arc(cx + (r() - 0.5) * arm * 1.8, cy - lift + (r() - 0.5) * half * 1.8, 2.5 + r() * 3, 0, 7); g.fill(); }
      });
      // উত্তরের সিঁড়ি
      g.fillStyle = '#a65a40';
      for (let s = 0; s < 5; s++) { g.fillRect(cx - 12, y + 8 + s * 6, 24, 5); g.fillStyle = s % 2 ? '#a65a40' : '#b86a4c'; }
      // মাঝের পূজার বেদী
      g.fillStyle = '#d9a06e'; g.beginPath(); g.arc(cx, cy - 28, 9, 0, 7); g.fill();
      g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(cx, cy - 30, 3, 0, 7); g.fill();
    } else if (kind === 'panam' || kind === 'panamBack' || kind === 'nachghar') {
      panamHouse(g, x, y + 4, iw, ih - 4, seed, kind === 'panamBack', kind === 'nachghar');
    } else if (kind === 'tomb') {
      g.fillStyle = '#cdbf9f'; g.fillRect(x - 2, y + 8, iw + 4, ih - 8); // মঞ্চ
      const bx = x + pad, by = y + pad + 4, bw = iw - pad * 2, bh = ih - pad - 6;
      const { roofBottom } = block(g, bx, by, bw, bh, { facadeH: T * 1.55, roof: '#e7decb', facade: ['#f7f1e3', '#ddd2bb'] });
      arches(g, bx + 10, roofBottom + 8, bw - 20, T * 1.55 - 8, 5, { bigCenter: true });
      // নকশা পাড়
      g.strokeStyle = 'rgba(70,90,110,0.35)'; g.setLineDash([4, 3]); g.lineWidth = 2;
      g.beginPath(); g.moveTo(bx + 4, roofBottom + 9); g.lineTo(bx + bw - 4, roofBottom + 9); g.stroke(); g.setLineDash([]);
      const midY = by + (roofBottom - by) / 2 + 10;
      [[bx + 14, by + 22], [bx + bw - 14, by + 22], [bx + 14, roofBottom + 6], [bx + bw - 14, roofBottom + 6]].forEach(([tx, ty]) => turret(g, tx, ty, 8, '#efe6d2', PLASTER));
      dome(g, bx + bw / 2, midY + 18, T * 0.95, BRONZE);
    } else if (kind === 'mosque') {
      const { roofBottom } = block(g, x + 4, y + 6, iw - 8, ih - 6, { facadeH: T * 1.45, roof: '#e2d3b2', facade: ['#f2e6cb', '#d8c7a4'] });
      arches(g, x + 16, roofBottom + 8, iw - 32, T * 1.45 - 8, 5, { bigCenter: true });
      const cy = y + 6 + (roofBottom - y - 6) / 2 + 22;
      const cx = x + iw / 2;
      dome(g, cx - T * 1.6, cy, T * 0.6, PLASTER);
      dome(g, cx + T * 1.6, cy, T * 0.6, PLASTER);
      dome(g, cx, cy, T * 0.78, PLASTER);
      [[x + 12, y + 18], [x + iw - 12, y + 18], [x + 12, roofBottom + 4], [x + iw - 12, roofBottom + 4]].forEach(([tx, ty]) => turret(g, tx, ty, 6, '#efe2c6', PLASTER));
    } else if (kind === 'diwan') {
      const { roofBottom } = block(g, x + 4, y + 4, iw - 8, ih - 4, { facadeH: T * 2.3, roof: '#d9c78f', facade: ['#efe0a8', '#d2bf83'], parapet: 'rgba(255,250,220,0.7)' });
      const fy = roofBottom + 6, fh = T * 2.3 - 6;
      arches(g, x + 14, fy, iw - 28, fh / 2 - 4, 7);
      g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(x + 4, fy + fh / 2 - 2, iw - 8, 4);
      arches(g, x + 14, fy + fh / 2 + 2, iw - 28, fh / 2 - 2, 7, { bigCenter: true });
      // ছাদে মারলনের সারি
      g.fillStyle = '#efe2b0';
      for (let i = x + 10; i < x + iw - 10; i += 14) { g.fillRect(i, y + 4, 8, 6); g.fillRect(i, roofBottom - 6, 8, 6); }
      [[x + 12, y + 16], [x + iw - 12, y + 16], [x + 12, roofBottom + 2], [x + iw - 12, roofBottom + 2]].forEach(([tx, ty]) => turret(g, tx, ty, 7, '#eadb9f', PLASTER));
    } else if (kind === 'hut') {
      const bx = x + 8, by = y + 14, bw = iw - 16, bh = ih - 14;
      shadowRect(g, bx, by, bw, bh);
      const fh = T * 1.05;
      const gr = g.createLinearGradient(0, by + bh - fh, 0, by + bh);
      gr.addColorStop(0, '#c49563'); gr.addColorStop(1, '#a87a4b');
      g.fillStyle = gr; g.fillRect(bx + 6, by + bh - fh, bw - 12, fh);
      g.fillStyle = '#3a2615'; rrect(g, bx + bw / 2 - 12, by + bh - fh + 14, 24, fh - 14, 3); g.fill();
      g.fillStyle = '#5a3b20'; g.fillRect(bx + 16, by + bh - fh + 14, 14, 12);
      // খড়ের চাল
      const rx = bx - 4, ry = by - 6, rw = bw + 8, rh = bh - fh + 16;
      const rg = g.createLinearGradient(0, ry, 0, ry + rh);
      rg.addColorStop(0, '#dcb46c'); rg.addColorStop(1, '#b08440');
      g.fillStyle = rg;
      g.beginPath(); g.moveTo(rx + rw * 0.25, ry); g.lineTo(rx + rw * 0.75, ry); g.lineTo(rx + rw, ry + rh); g.lineTo(rx, ry + rh); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(110,75,25,0.45)'; g.lineWidth = 1;
      for (let i = 0; i < 26; i++) { const t = i / 25; g.beginPath(); g.moveTo(rx + rw * (0.25 + 0.5 * t), ry); g.lineTo(rx + rw * t, ry + rh); g.stroke(); }
      g.fillStyle = '#8c6430'; g.fillRect(rx + rw * 0.25, ry - 2, rw * 0.5, 5);
      g.fillStyle = 'rgba(60,35,10,0.35)'; g.fillRect(rx, ry + rh - 4, rw, 5);
    }
    return { img: c, ox: -x, oy: -top }; // ফুটপ্রিন্টের উপর-বাম কোণ থেকে কতটা সরিয়ে আঁকতে হবে
  }

  function gateSprite(spanT) {
    const w = spanT * T, h = T * 2.6;
    const c = canvas(w, h);
    const g = c.getContext('2d');
    const base = h - 2;
    const tower = (cx) => {
      const r = T * 0.62;
      g.fillStyle = 'rgba(20,10,0,0.3)'; g.beginPath(); g.ellipse(cx + 8, base - 4, r + 4, 10, 0, 0, 7); g.fill();
      const gr = g.createLinearGradient(cx - r, 0, cx + r, 0);
      gr.addColorStop(0, '#b4593a'); gr.addColorStop(0.5, '#9a4528'); gr.addColorStop(1, '#6e2e18');
      g.fillStyle = gr; g.fillRect(cx - r, base - T * 1.55, r * 2, T * 1.55);
      g.strokeStyle = 'rgba(60,20,5,0.35)'; g.lineWidth = 1;
      for (let yy = base - T * 1.55 + 6; yy < base; yy += 7) { g.beginPath(); g.moveTo(cx - r, yy); g.lineTo(cx + r, yy); g.stroke(); }
      g.fillStyle = '#2a1a10'; rrect(g, cx - 6, base - T * 1.15, 12, 18, 6); g.fill();
      g.fillStyle = '#c56a46'; g.fillRect(cx - r - 3, base - T * 1.6, r * 2 + 6, 7);
      dome(g, cx, base - T * 1.58, r * 0.85, PLASTER);
    };
    tower(T * 0.5);
    tower(w - T * 0.5);
    return { img: c, ax: 0, ay: h };
  }

  function stele() {
    const c = canvas(T, T * 1.3);
    const g = c.getContext('2d');
    const ax = T / 2, ay = c.height - 6;
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(ax + 5, ay - 2, 16, 6, 0, 0, 7); g.fill();
    g.fillStyle = '#8d8a80'; g.fillRect(ax - 16, ay - 8, 32, 8);
    const gr = g.createLinearGradient(ax - 12, 0, ax + 12, 0);
    gr.addColorStop(0, '#b9b5a8'); gr.addColorStop(1, '#7d7a70');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(ax - 12, ay - 8); g.lineTo(ax - 12, ay - 38); g.quadraticCurveTo(ax, ay - 50, ax + 12, ay - 38); g.lineTo(ax + 12, ay - 8); g.fill();
    g.strokeStyle = 'rgba(40,40,35,0.55)'; g.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(ax - 7, ay - 34 + i * 6); g.lineTo(ax + 7 - (i % 2) * 3, ay - 34 + i * 6); g.stroke(); }
    return { img: c, ax, ay };
  }

  // ================= চরিত্র (প্রতি ফ্রেমে আঁকা) =================
  function explorer(g, x, y, t, dir, moving, digT) {
    const bob = moving ? Math.abs(Math.sin(t * 14)) * -2 : Math.sin(t * 2) * 0.6;
    const step = moving ? Math.sin(t * 14) * 3 : 0;
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(x, y - 3, 13, 5, 0, 0, 7); g.fill();
    // পা
    g.fillStyle = '#4a3a2a';
    g.fillRect(x - 7, y - 14 + Math.max(0, step), 5, 11 - Math.max(0, step));
    g.fillRect(x + 2, y - 14 + Math.max(0, -step), 5, 11 - Math.max(0, -step));
    g.fillStyle = '#2b1d12'; g.fillRect(x - 8, y - 5, 7, 3); g.fillRect(x + 1, y - 5, 7, 3);
    const by = y - 30 + bob;
    // ব্যাগ (পিছনে)
    if (dir !== 'down') { g.fillStyle = '#7a4a26'; rrect(g, x - 9, by + 3, 18, 13, 3); g.fill(); }
    // শরীর
    g.fillStyle = '#c9a86b'; rrect(g, x - 10, by, 20, 18, 5); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x + 4, by + 2, 5, 15);
    g.fillStyle = '#6b4423'; g.fillRect(x - 10, by + 12, 20, 3);
    if (dir === 'down') { g.strokeStyle = '#6b4423'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - 8, by + 1); g.lineTo(x + 8, by + 12); g.stroke(); }
    // হাত
    const swing = moving ? Math.sin(t * 14) * 3 : 0;
    let armL = swing, armR = -swing;
    if (digT != null) { const d = Math.sin(digT * Math.PI * 4) * 6; armL = d; armR = d; }
    g.fillStyle = '#c98b5e';
    g.beginPath(); g.arc(x - 12, by + 9 + armL, 3.5, 0, 7); g.fill();
    g.beginPath(); g.arc(x + 12, by + 9 + armR, 3.5, 0, 7); g.fill();
    if (digT != null) { // কোদাল
      g.strokeStyle = '#7a5530'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 12, by + 6 + armR); g.lineTo(x + 6, by + 26 + armR); g.stroke();
      g.fillStyle = '#9aa3a8'; g.beginPath(); g.moveTo(x + 2, by + 24 + armR); g.lineTo(x + 11, by + 26 + armR); g.lineTo(x + 7, by + 34 + armR); g.closePath(); g.fill();
    }
    // মাথা
    const hy = by - 7;
    g.fillStyle = '#c98b5e'; g.beginPath(); g.arc(x, hy, 8.5, 0, 7); g.fill();
    if (dir !== 'up') {
      g.fillStyle = '#2a1a10';
      const ex = dir === 'left' ? -3 : dir === 'right' ? 3 : 0;
      if (dir === 'down') { g.fillRect(x - 4, hy + 1, 2, 2.5); g.fillRect(x + 2, hy + 1, 2, 2.5); }
      else g.fillRect(x + ex, hy + 1, 2, 2.5);
    } else { g.fillStyle = '#3a2414'; g.beginPath(); g.arc(x, hy + 1, 8, 0.1, Math.PI - 0.1); g.fill(); }
    // টুপি
    g.fillStyle = '#d9b877'; g.beginPath(); g.ellipse(x, hy - 4, 14, 5, 0, 0, 7); g.fill();
    g.fillStyle = '#b8945a'; g.beginPath(); g.ellipse(x, hy - 3, 14, 4, 0, 0, Math.PI); g.fill();
    g.fillStyle = '#e6c88a'; g.beginPath(); g.ellipse(x, hy - 8, 8.5, 6.5, 0, Math.PI, 0); g.fill(); g.fillRect(x - 8.5, hy - 8, 17, 3);
    g.fillStyle = '#7a4a20'; g.fillRect(x - 8.5, hy - 7, 17, 2.5);
  }

  function caretaker(g, x, y, t) {
    const br = Math.sin(t * 2) * 0.8;
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(x, y - 3, 13, 5, 0, 0, 7); g.fill();
    // লাঠি
    g.strokeStyle = '#6b4a2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 15, y - 2); g.lineTo(x + 13, y - 48); g.stroke();
    // লুঙ্গি
    g.fillStyle = '#2f5f99'; g.beginPath(); g.moveTo(x - 10, y - 18); g.lineTo(x + 10, y - 18); g.lineTo(x + 11, y - 3); g.lineTo(x - 11, y - 3); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1;
    for (let i = -8; i <= 8; i += 5) { g.beginPath(); g.moveTo(x + i, y - 18); g.lineTo(x + i, y - 3); g.stroke(); }
    g.beginPath(); g.moveTo(x - 10, y - 11); g.lineTo(x + 10, y - 11); g.stroke();
    // পাঞ্জাবি
    const by = y - 34 + br;
    g.fillStyle = '#f1ede2'; rrect(g, x - 11, by, 22, 20, 5); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(x + 5, by + 2, 5, 17);
    g.fillStyle = '#cfc9b8'; g.fillRect(x - 1, by + 2, 2, 9);
    g.fillStyle = '#a5714c'; g.beginPath(); g.arc(x - 12, by + 10, 3.5, 0, 7); g.fill(); g.beginPath(); g.arc(x + 12, by + 8, 3.5, 0, 7); g.fill();
    // মাথা, দাড়ি, টুপি
    const hy = by - 7;
    g.fillStyle = '#a5714c'; g.beginPath(); g.arc(x, hy, 8.5, 0, 7); g.fill();
    g.fillStyle = '#e9e6de'; g.beginPath(); g.arc(x, hy + 3, 7.5, 0.15, Math.PI - 0.15); g.fill();
    g.fillStyle = '#2a1a10'; g.fillRect(x - 4, hy - 1, 2, 2.2); g.fillRect(x + 2, hy - 1, 2, 2.2);
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x, hy - 6, 8, 4.5, 0, Math.PI, 0); g.fill(); g.fillRect(x - 8, hy - 6, 16, 2);
  }

  // মিঠু — কবুতরকে দানা খাওয়ানো ছোট ছেলে
  function kid(g, x, y, t, throwing) {
    const hop = Math.abs(Math.sin(t * 3)) * 1.2;
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x, y - 3, 10, 4, 0, 0, 7); g.fill();
    g.fillStyle = '#3b3a46'; g.fillRect(x - 6, y - 12, 5, 9); g.fillRect(x + 1, y - 12, 5, 9);
    g.fillStyle = '#2a1a10'; g.fillRect(x - 7, y - 4, 6, 3); g.fillRect(x + 1, y - 4, 6, 3);
    const by = y - 25 - hop;
    g.fillStyle = '#d6453a'; rrect(g, x - 8, by, 16, 14, 4); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x - 8, by + 5, 16, 2);
    g.fillStyle = '#b07a52';
    const arm = throwing ? -8 : 0;
    g.beginPath(); g.arc(x - 10, by + 7, 3, 0, 7); g.fill();
    g.beginPath(); g.arc(x + 10, by + 7 + arm, 3, 0, 7); g.fill();
    g.fillStyle = '#e6d3a3'; rrect(g, x + 6, by + 8, 7, 6, 2); g.fill(); // দানার থলে
    const hy = by - 6;
    g.fillStyle = '#b07a52'; g.beginPath(); g.arc(x, hy, 7.5, 0, 7); g.fill();
    g.fillStyle = '#1e140c'; g.beginPath(); g.arc(x, hy - 2.5, 7.6, Math.PI, 0); g.fill(); g.fillRect(x - 7.6, hy - 3, 3, 4);
    g.fillStyle = '#1e140c'; g.fillRect(x - 3.5, hy + 0.5, 1.8, 2); g.fillRect(x + 1.7, hy + 0.5, 1.8, 2);
    g.strokeStyle = '#7a3f2a'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, hy + 3, 2.2, 0.2, Math.PI - 0.2); g.stroke();
  }

  // কবুতর
  function pigeon(g, p, t) {
    const { x, y, z, dir } = p;
    g.fillStyle = `rgba(0,0,0,${0.22 - Math.min(0.15, z / 400)})`;
    g.beginPath(); g.ellipse(x, y, 6 - Math.min(3, z / 40), 2.4, 0, 0, 7); g.fill();
    const by = y - 5 - z;
    g.save(); g.translate(x, by); g.scale(dir, 1);
    if (z > 1) {
      const flap = Math.sin(t * 28 + p.seed) * 7;
      g.fillStyle = '#9aa0aa';
      g.beginPath(); g.moveTo(-2, 0); g.lineTo(-8, -flap); g.lineTo(2, -2); g.fill();
      g.beginPath(); g.moveTo(-1, 0); g.lineTo(-4, flap * 0.8 - 2); g.lineTo(3, -1); g.fill();
    }
    g.fillStyle = '#8e939d'; g.beginPath(); g.ellipse(0, 0, 6.5, 4, 0, 0, 7); g.fill();
    g.fillStyle = '#5b606b'; g.beginPath(); g.moveTo(-6, -1); g.lineTo(-10, 1); g.lineTo(-6, 2); g.fill();
    g.fillStyle = '#c9ced6'; g.beginPath(); g.ellipse(-1, -1, 3.5, 2, 0, 0, 7); g.fill();
    const peck = z < 1 && p.state === 'peck' ? Math.max(0, Math.sin(t * 6 + p.seed * 3)) * 3 : 0;
    g.fillStyle = '#4c7f73'; g.beginPath(); g.arc(5, -2 + peck * 0.6, 2.6, 0, 7); g.fill();
    g.fillStyle = '#6a6f7a'; g.beginPath(); g.arc(6.5, -4 + peck, 2.6, 0, 7); g.fill();
    g.fillStyle = '#d98b5f'; g.fillRect(8.5, -4 + peck, 2.4, 1.3);
    g.fillStyle = '#c0392b'; g.fillRect(7, -5 + peck, 1.2, 1.2);
    g.restore();
  }

  function butterfly(g, b, t) {
    const flap = Math.abs(Math.sin(t * 16 + b.seed));
    g.save(); g.translate(b.x, b.y);
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.ellipse(2, 16, 3, 1.2, 0, 0, 7); g.fill();
    g.fillStyle = b.color;
    g.beginPath(); g.ellipse(-3 * flap - 1, 0, 3.6 * flap + 0.6, 3, -0.3, 0, 7); g.fill();
    g.beginPath(); g.ellipse(3 * flap + 1, 0, 3.6 * flap + 0.6, 3, 0.3, 0, 7); g.fill();
    g.fillStyle = '#2a1a10'; g.fillRect(-0.6, -2.5, 1.2, 5);
    g.restore();
  }

  // মাজারের মেঝের নকশা (টালির ধাঁধার জন্য)
  function medallion(size) {
    const c = canvas(size, size), g = c.getContext('2d'), m = size / 2;
    g.fillStyle = '#efe7d6'; g.fillRect(0, 0, size, size);
    g.strokeStyle = '#1f3d6b'; g.lineWidth = size * 0.035; g.strokeRect(size * 0.04, size * 0.04, size * 0.92, size * 0.92);
    g.strokeStyle = '#c69a3a'; g.lineWidth = size * 0.012; g.strokeRect(size * 0.08, size * 0.08, size * 0.84, size * 0.84);
    // কোণের অর্ধচন্দ্র নকশা
    for (const [cx, cy, a] of [[0, 0, 0], [size, 0, Math.PI / 2], [size, size, Math.PI], [0, size, -Math.PI / 2]]) {
      g.save(); g.translate(cx, cy); g.rotate(a);
      g.fillStyle = '#2f6b4f'; g.beginPath(); g.arc(0, 0, size * 0.26, 0, Math.PI / 2); g.lineTo(0, 0); g.fill();
      g.fillStyle = '#efe7d6'; g.beginPath(); g.arc(0, 0, size * 0.19, 0, Math.PI / 2); g.lineTo(0, 0); g.fill();
      g.fillStyle = '#b8402c'; g.beginPath(); g.arc(size * 0.1, size * 0.1, size * 0.04, 0, 7); g.fill();
      g.restore();
    }
    // আট পাপড়ির ফুল
    g.fillStyle = '#1f3d6b'; g.beginPath(); g.arc(m, m, size * 0.33, 0, 7); g.fill();
    g.fillStyle = '#efe7d6'; g.beginPath(); g.arc(m, m, size * 0.3, 0, 7); g.fill();
    for (let i = 0; i < 8; i++) {
      g.save(); g.translate(m, m); g.rotate((i / 8) * Math.PI * 2);
      g.fillStyle = i % 2 ? '#b8402c' : '#2f6b4f';
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(size * 0.09, -size * 0.14, 0, -size * 0.28); g.quadraticCurveTo(-size * 0.09, -size * 0.14, 0, 0); g.fill();
      g.fillStyle = '#c69a3a'; g.beginPath(); g.arc(0, -size * 0.2, size * 0.015, 0, 7); g.fill();
      g.restore();
    }
    g.fillStyle = '#c69a3a'; g.beginPath(); g.arc(m, m, size * 0.06, 0, 7); g.fill();
    g.fillStyle = '#1f3d6b'; g.beginPath(); g.arc(m, m, size * 0.03, 0, 7); g.fill();
    // কিনারার লতাপাতা
    g.strokeStyle = '#2f6b4f'; g.lineWidth = size * 0.012;
    for (let i = 0; i < 4; i++) {
      g.save(); g.translate(m, m); g.rotate((i * Math.PI) / 2);
      g.beginPath(); g.moveTo(-size * 0.2, -size * 0.4); g.quadraticCurveTo(0, -size * 0.34, size * 0.2, -size * 0.4); g.stroke();
      g.fillStyle = '#b8402c'; g.beginPath(); g.arc(0, -size * 0.37, size * 0.025, 0, 7); g.fill();
      g.restore();
    }
    return c;
  }

  // সাধারণ মানুষ: মাঝি, তাঁতি ইত্যাদি
  function person(g, x, y, t, o) {
    const br = Math.sin(t * 2 + (o.phase || 0)) * 0.8;
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(x, y - 3, 13, 5, 0, 0, 7); g.fill();
    if (o.pole) { g.strokeStyle = '#8a6a3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 15, y + 4); g.lineTo(x + 11, y - 62); g.stroke(); }
    if (o.saree) {
      g.fillStyle = o.bottom; g.beginPath(); g.moveTo(x - 9, y - 20); g.lineTo(x + 9, y - 20); g.lineTo(x + 12, y - 3); g.lineTo(x - 12, y - 3); g.fill();
      g.fillStyle = o.border || '#c0392b'; g.fillRect(x - 12, y - 6, 24, 3);
    } else {
      g.fillStyle = o.bottom; g.beginPath(); g.moveTo(x - 10, y - 18); g.lineTo(x + 10, y - 18); g.lineTo(x + 11, y - 3); g.lineTo(x - 11, y - 3); g.fill();
      if (o.checks) { g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 1; for (let i = -8; i <= 8; i += 5) { g.beginPath(); g.moveTo(x + i, y - 18); g.lineTo(x + i, y - 3); g.stroke(); } g.beginPath(); g.moveTo(x - 10, y - 10); g.lineTo(x + 10, y - 10); g.stroke(); }
      g.fillStyle = o.skin; g.fillRect(x - 7, y - 4, 5, 3); g.fillRect(x + 2, y - 4, 5, 3);
    }
    const by = y - 34 + br;
    g.fillStyle = o.top; rrect(g, x - 11, by, 22, 20, 5); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.1)'; g.fillRect(x + 5, by + 2, 5, 17);
    if (o.saree) { g.fillStyle = o.bottom; g.beginPath(); g.moveTo(x - 11, by + 2); g.lineTo(x + 8, by + 20); g.lineTo(x - 2, by + 20); g.fill(); g.fillStyle = o.border || '#c0392b'; g.fillRect(x - 11, by + 1, 6, 3); }
    if (o.robe) { // চীবর: এক কাঁধে জড়ানো
      g.fillStyle = 'rgba(120,50,0,0.35)'; g.beginPath(); g.moveTo(x - 11, by); g.lineTo(x - 4, by); g.lineTo(x + 11, by + 18); g.lineTo(x + 11, by + 20); g.lineTo(x + 4, by + 20); g.closePath(); g.fill();
      g.fillStyle = o.skin; g.beginPath(); g.arc(x + 7, by + 3, 3.5, 0, 7); g.fill();
    }
    if (o.gamchha) { g.fillStyle = '#d64545'; g.fillRect(x - 11, by + 1, 22, 4); g.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = -9; i < 11; i += 5) g.fillRect(x + i, by + 1, 2, 4); }
    g.fillStyle = o.skin; g.beginPath(); g.arc(x - 12, by + 10, 3.5, 0, 7); g.fill(); g.beginPath(); g.arc(x + 12, by + 8, 3.5, 0, 7); g.fill();
    const hy = by - 7;
    g.fillStyle = o.skin; g.beginPath(); g.arc(x, hy, 8.5, 0, 7); g.fill();
    if (o.beard) { g.fillStyle = o.beard; g.beginPath(); g.arc(x, hy + 3, 7.5, 0.15, Math.PI - 0.15); g.fill(); }
    g.fillStyle = '#2a1a10'; g.fillRect(x - 4, hy - 1, 2, 2.2); g.fillRect(x + 2, hy - 1, 2, 2.2);
    if (o.hair) { g.fillStyle = o.hair; g.beginPath(); g.arc(x, hy - 2, 8.7, Math.PI * 1.05, Math.PI * 1.95); g.fill(); }
    if (o.bun) { g.fillStyle = o.hair; g.beginPath(); g.arc(x, hy - 8, 4.5, 0, 7); g.fill(); }
    if (o.veil) { g.fillStyle = o.bottom; g.beginPath(); g.arc(x, hy - 1, 10, Math.PI * 0.95, Math.PI * 2.05); g.lineTo(x + 10, hy + 8); g.lineTo(x + 7, hy + 2); g.lineTo(x - 7, hy + 2); g.lineTo(x - 10, hy + 8); g.fill(); g.fillStyle = o.border || '#c0392b'; g.beginPath(); g.arc(x, hy - 1, 10, Math.PI * 1.1, Math.PI * 1.9); g.lineWidth = 2; g.strokeStyle = o.border; g.stroke(); }
    if (o.hat === 'tupi') { g.fillStyle = '#fbfaf5'; g.beginPath(); g.ellipse(x, hy - 5, 8.4, 5, 0, Math.PI, 0); g.fill(); g.fillRect(x - 8.4, hy - 5, 16.8, 2); g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x - 6, hy - 7); g.lineTo(x + 6, hy - 7); g.stroke(); }
    if (o.hat === 'safari') {
      g.fillStyle = '#c8b07a'; g.beginPath(); g.ellipse(x, hy - 4, 14, 5, 0, 0, 7); g.fill();
      g.fillStyle = '#d8c28c'; g.beginPath(); g.ellipse(x, hy - 7, 8.5, 6, 0, Math.PI, 0); g.fill(); g.fillRect(x - 8.5, hy - 7, 17, 3);
      g.fillStyle = '#6b5a3a'; g.fillRect(x - 8.5, hy - 6, 17, 2);
    }
    if (o.glasses) { g.strokeStyle = '#2a2a2a'; g.lineWidth = 1.2; g.strokeRect(x - 6, hy - 2, 4.5, 3.5); g.strokeRect(x + 1.5, hy - 2, 4.5, 3.5); }
    if (o.hat === 'mathal') { // মাথাল (বাঁশের টুপি)
      g.fillStyle = '#c9a463'; g.beginPath(); g.ellipse(x, hy - 5, 16, 6, 0, 0, 7); g.fill();
      g.fillStyle = '#b08a4a'; g.beginPath(); g.moveTo(x - 16, hy - 5); g.lineTo(x, hy - 14); g.lineTo(x + 16, hy - 5); g.fill();
      g.strokeStyle = 'rgba(90,60,20,0.5)'; g.lineWidth = 1; for (let i = -12; i <= 12; i += 6) { g.beginPath(); g.moveTo(x, hy - 14); g.lineTo(x + i, hy - 4); g.stroke(); }
    }
  }

  // নৌকা (ছইওয়ালা)
  function boat(g, x, y, t, len = 100) {
    const bob = Math.sin(t * 1.6) * 2, tilt = Math.sin(t * 1.1) * 0.03;
    g.save(); g.translate(x, y + bob); g.rotate(tilt);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(4, 10, len / 2, 9, 0, 0, 7); g.fill();
    g.fillStyle = '#6b4423';
    g.beginPath(); g.moveTo(-len / 2, -6); g.quadraticCurveTo(0, 14, len / 2, -6); g.quadraticCurveTo(len / 2 - 6, 4, len / 2 - 16, 6); g.lineTo(-len / 2 + 16, 6); g.quadraticCurveTo(-len / 2 + 6, 4, -len / 2, -6); g.fill();
    g.fillStyle = '#8a5a2e'; g.beginPath(); g.moveTo(-len / 2 + 6, -3); g.quadraticCurveTo(0, 6, len / 2 - 6, -3); g.lineTo(len / 2 - 10, -1); g.quadraticCurveTo(0, 3, -len / 2 + 10, -1); g.fill();
    // ছই
    g.fillStyle = '#b8935a'; g.beginPath(); g.moveTo(-len * 0.18, 0); g.quadraticCurveTo(0, -26, len * 0.18, 0); g.fill();
    g.strokeStyle = 'rgba(90,60,20,0.55)'; g.lineWidth = 1;
    for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(len * 0.05 * i, -13 + Math.abs(i) * 1.5); g.lineTo(len * 0.05 * i, 0); g.stroke(); }
    g.strokeStyle = '#3a2a14'; g.lineWidth = 2; g.beginPath(); g.moveTo(len * 0.32, -4); g.lineTo(len * 0.42, -26); g.stroke();
    g.restore();
  }

  // গলির দরজা (তালাসহ)
  function alleyGate(g, x, y, open, lockColor, t) {
    // খিলান
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + 4, y + T - 6, T, 8);
    g.fillStyle = '#9c4a2c'; g.fillRect(x - 4, y - T * 0.9, 8, T * 1.9); g.fillRect(x + T - 4, y - T * 0.9, 8, T * 1.9);
    g.beginPath(); g.moveTo(x - 4, y - T * 0.7); g.quadraticCurveTo(x + T / 2, y - T * 1.35, x + T + 4, y - T * 0.7); g.lineTo(x + T + 4, y - T * 0.5); g.quadraticCurveTo(x + T / 2, y - T * 1.1, x - 4, y - T * 0.5); g.fill();
    g.fillStyle = 'rgba(255,220,180,0.25)'; g.fillRect(x - 4, y - T * 0.9, 3, T * 1.9);
    if (open) {
      g.fillStyle = '#5a3a1e'; g.fillRect(x + 2, y - T * 0.5, 6, T * 1.4); g.fillRect(x + T - 8, y - T * 0.5, 6, T * 1.4);
      return;
    }
    const dg = g.createLinearGradient(x, 0, x + T, 0);
    dg.addColorStop(0, '#6b4226'); dg.addColorStop(0.5, '#7d5030'); dg.addColorStop(1, '#5a3620');
    g.fillStyle = dg; g.fillRect(x + 4, y - T * 0.55, T - 8, T * 1.45);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x + T / 2, y - T * 0.55); g.lineTo(x + T / 2, y + T * 0.9); g.stroke();
    for (const yy of [y - T * 0.3, y + T * 0.15, y + T * 0.6]) { g.fillStyle = '#3a2a1a'; g.fillRect(x + 4, yy, T - 8, 3); for (let k = x + 8; k < x + T - 6; k += 8) { g.fillStyle = '#c9a463'; g.beginPath(); g.arc(k, yy + 1.5, 1.3, 0, 7); g.fill(); } }
    // তালা
    const lx = x + T / 2, ly = y + T * 0.05;
    g.strokeStyle = lockColor; g.lineWidth = 2.5; g.beginPath(); g.arc(lx, ly - 4, 5, Math.PI, 0); g.stroke();
    g.fillStyle = lockColor; rrect(g, lx - 7, ly - 4, 14, 12, 2); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(lx, ly + 1, 1.8, 0, 7); g.fill(); g.fillRect(lx - 0.8, ly + 1, 1.6, 4);
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(lx - 6, ly - 3, 3, 9);
  }

  // তাঁত
  function loom(g, x, y, t) {
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 6, y + T - 8, T * 1.6, 8);
    g.fillStyle = '#7a5230'; g.fillRect(x + 2, y + 6, 5, T - 8); g.fillRect(x + T * 1.6 - 3, y + 6, 5, T - 8);
    g.fillRect(x, y + 6, T * 1.6 + 4, 5); g.fillRect(x, y + T - 14, T * 1.6 + 4, 5);
    // সুতো আর বোনা কাপড়
    g.strokeStyle = 'rgba(240,235,220,0.7)'; g.lineWidth = 0.8;
    for (let i = x + 9; i < x + T * 1.6 - 2; i += 3) { g.beginPath(); g.moveTo(i, y + 11); g.lineTo(i, y + T - 22); g.stroke(); }
    g.fillStyle = '#f1ead8'; g.fillRect(x + 8, y + T - 26, T * 1.6 - 12, 12);
    g.fillStyle = '#c0392b'; for (let i = x + 10; i < x + T * 1.6 - 6; i += 7) g.fillRect(i, y + T - 22, 4, 3);
    const sh = Math.sin(t * 3) * T * 0.5; // মাকু
    g.fillStyle = '#c9a463'; rrect(g, x + T * 0.8 + sh - 6, y + T - 30, 12, 4, 2); g.fill();
  }

  // নকশিকাঁথার নকশা (টালির ধাঁধার দ্বিতীয় ছবি)
  function kantha(size) {
    const c = canvas(size, size), g = c.getContext('2d'), m = size / 2;
    g.fillStyle = '#f3ecdc'; g.fillRect(0, 0, size, size);
    // চলন সেলাইয়ের ঢেউ
    g.strokeStyle = 'rgba(80,90,140,0.35)'; g.lineWidth = 1; g.setLineDash([4, 3]);
    for (let yy = 8; yy < size; yy += 7) { g.beginPath(); g.moveTo(0, yy); g.lineTo(size, yy); g.stroke(); }
    g.setLineDash([]);
    // পাড়
    g.strokeStyle = '#b8402c'; g.lineWidth = size * 0.03; g.strokeRect(size * 0.04, size * 0.04, size * 0.92, size * 0.92);
    g.strokeStyle = '#2a4a8a'; g.lineWidth = size * 0.012; g.setLineDash([6, 4]); g.strokeRect(size * 0.09, size * 0.09, size * 0.82, size * 0.82); g.setLineDash([]);
    // কোণে কলকা (আমের নকশা)
    for (const [cx, cy, a] of [[size * 0.2, size * 0.2, -0.8], [size * 0.8, size * 0.2, 0.8], [size * 0.8, size * 0.8, 2.35], [size * 0.2, size * 0.8, -2.35]]) {
      g.save(); g.translate(cx, cy); g.rotate(a);
      g.fillStyle = '#2a4a8a'; g.beginPath(); g.moveTo(0, -size * 0.09); g.bezierCurveTo(size * 0.08, -size * 0.06, size * 0.07, size * 0.08, 0, size * 0.08); g.bezierCurveTo(-size * 0.07, size * 0.08, -size * 0.06, -size * 0.02, size * 0.02, -size * 0.02); g.quadraticCurveTo(-size * 0.02, -size * 0.06, 0, -size * 0.09); g.fill();
      g.fillStyle = '#e8b33a'; g.beginPath(); g.arc(0, size * 0.03, size * 0.025, 0, 7); g.fill();
      g.restore();
    }
    // মাঝখানে শতদল পদ্ম
    for (let ring = 0; ring < 2; ring++) {
      const n = ring ? 8 : 12, len = ring ? 0.16 : 0.27, col = ring ? '#e8b33a' : '#b8402c';
      for (let i = 0; i < n; i++) {
        g.save(); g.translate(m, m); g.rotate((i / n) * Math.PI * 2 + ring * 0.2);
        g.fillStyle = col; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(size * 0.06, -size * len * 0.5, 0, -size * len); g.quadraticCurveTo(-size * 0.06, -size * len * 0.5, 0, 0); g.fill();
        g.restore();
      }
    }
    g.fillStyle = '#2a4a8a'; g.beginPath(); g.arc(m, m, size * 0.06, 0, 7); g.fill();
    g.fillStyle = '#f3ecdc'; g.beginPath(); g.arc(m, m, size * 0.025, 0, 7); g.fill();
    // মাঝের পাশে মাছ আর পাখি
    const fish = (cx, cy, a) => { g.save(); g.translate(cx, cy); g.rotate(a); g.fillStyle = '#2f6b4f'; g.beginPath(); g.ellipse(0, 0, size * 0.06, size * 0.025, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(size * 0.05, 0); g.lineTo(size * 0.09, -size * 0.025); g.lineTo(size * 0.09, size * 0.025); g.fill(); g.restore(); };
    fish(m, size * 0.15, 0); fish(size * 0.85, m, Math.PI / 2); fish(m, size * 0.85, Math.PI); fish(size * 0.15, m, -Math.PI / 2);
    return c;
  }

  // প্রত্নতত্ত্বের তাঁবু
  function tent(g, x, y, t) {
    const w = T * 3, h = T * 2;
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.moveTo(x + 10, y + h + 4); g.lineTo(x + w + 14, y + h + 4); g.lineTo(x + w + 8, y + 18); g.lineTo(x + 18, y + 18); g.fill();
    const flap = Math.sin(t * 1.5) * 1.5;
    g.fillStyle = '#c9b58a'; g.beginPath(); g.moveTo(x + 6, y + h); g.lineTo(x + w / 2, y + 6 + flap); g.lineTo(x + w - 6, y + h); g.fill();
    g.fillStyle = '#b29d70'; g.beginPath(); g.moveTo(x + w / 2, y + 6 + flap); g.lineTo(x + w - 6, y + h); g.lineTo(x + w / 2 + 10, y + h); g.fill();
    g.fillStyle = '#3a2d1c'; g.beginPath(); g.moveTo(x + w / 2 - 14, y + h); g.lineTo(x + w / 2, y + 30); g.lineTo(x + w / 2 + 14, y + h); g.fill();
    g.strokeStyle = 'rgba(90,70,40,0.7)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x + w / 2, y + 6); g.lineTo(x - 6, y + h - 10); g.moveTo(x + w / 2, y + 6); g.lineTo(x + w + 6, y + h - 10); g.stroke();
    g.fillStyle = '#c0392b'; g.fillRect(x + w / 2 - 1, y - 8, 2, 14); g.beginPath(); g.moveTo(x + w / 2 + 1, y - 8); g.lineTo(x + w / 2 + 12 + flap, y - 4); g.lineTo(x + w / 2 + 1, y); g.fill();
  }
  // খনন-গর্ত (দড়ির গ্রিড)
  function trench(g, x, y, w, h) {
    g.fillStyle = '#6e3a24'; g.fillRect(x + 4, y + 4, w - 8, h - 8);
    g.fillStyle = '#5a2d1b'; g.fillRect(x + 4, y + 4, w - 8, 8);
    g.fillStyle = '#9c5238'; for (let i = 0; i < 6; i++) g.fillRect(x + 10 + (i * 37) % (w - 30), y + 16 + (i * 23) % (h - 30), 14, 7);
    g.strokeStyle = 'rgba(240,230,200,0.85)'; g.lineWidth = 1;
    for (let k = x + 4; k <= x + w - 4; k += (w - 8) / 4) { g.beginPath(); g.moveTo(k, y + 4); g.lineTo(k, y + h - 4); g.stroke(); }
    for (let k = y + 4; k <= y + h - 4; k += (h - 8) / 2) { g.beginPath(); g.moveTo(x + 4, k); g.lineTo(x + w - 4, k); g.stroke(); }
    g.fillStyle = '#e8d9b0'; for (const [px, py] of [[x + 4, y + 4], [x + w - 4, y + 4], [x + 4, y + h - 4], [x + w - 4, y + h - 4]]) g.fillRect(px - 2, py - 6, 4, 8);
  }
  // খুঁজে পাওয়া জিনিসের টেবিল
  function findsTable(g, x, y) {
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 8, y + 22, T * 1.8, 16);
    g.fillStyle = '#7a5530'; g.fillRect(x + 4, y + 30, 4, 14); g.fillRect(x + T * 1.8 - 4, y + 30, 4, 14);
    g.fillStyle = '#9a7040'; g.fillRect(x, y + 14, T * 1.9, 18);
    g.fillStyle = '#d98c5f'; g.fillRect(x + 8, y + 16, 12, 10); g.fillRect(x + 26, y + 18, 10, 9);
    g.fillStyle = '#c9a463'; g.beginPath(); g.arc(x + 46, y + 22, 4, 0, 7); g.arc(x + 56, y + 21, 3, 0, 7); g.fill();
    g.fillStyle = '#b87333'; g.fillRect(x + 64, y + 16, 16, 11);
    g.fillStyle = '#f1ead8'; g.fillRect(x + 22, y + 4, 22, 12);
  }
  // কক্ষের নম্বর-পাথর
  function cellMark(g, x, y, n) {
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x - 9, y - 6, 20, 14);
    g.fillStyle = '#d8c6a0'; rrect(g, x - 11, y - 9, 22, 14, 3); g.fill();
    g.fillStyle = '#5a3a20'; g.font = '700 11px Hind Siliguri, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(n, x, y - 1.5);
  }
  // পোড়ামাটির সিলমোহর (ধর্মচক্র)
  function seal(size) {
    const c = canvas(size, size), g = c.getContext('2d'), m = size / 2;
    g.fillStyle = '#e8d9b8'; g.fillRect(0, 0, size, size);
    const gr = g.createRadialGradient(m * 0.8, m * 0.7, 0, m, m, m);
    gr.addColorStop(0, '#d98c5f'); gr.addColorStop(1, '#9c4f30');
    g.fillStyle = gr; g.beginPath(); g.arc(m, m, size * 0.46, 0, 7); g.fill();
    g.strokeStyle = '#6e301c'; g.lineWidth = size * 0.015; g.beginPath(); g.arc(m, m, size * 0.42, 0, 7); g.stroke();
    // কিনারার লেখার মতো দাগ
    g.fillStyle = '#6e301c';
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; g.save(); g.translate(m + Math.cos(a) * size * 0.38, m + Math.sin(a) * size * 0.38); g.rotate(a + Math.PI / 2); g.fillRect(-size * 0.008, -size * 0.02, size * 0.016, size * (0.02 + (i % 3) * 0.008)); g.restore(); }
    // ধর্মচক্র
    const wy = m - size * 0.06;
    g.strokeStyle = '#5a2a14'; g.lineWidth = size * 0.022;
    g.beginPath(); g.arc(m, wy, size * 0.16, 0, 7); g.stroke();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.beginPath(); g.moveTo(m, wy); g.lineTo(m + Math.cos(a) * size * 0.16, wy + Math.sin(a) * size * 0.16); g.stroke(); }
    g.fillStyle = '#5a2a14'; g.beginPath(); g.arc(m, wy, size * 0.035, 0, 7); g.fill();
    // দুই পাশে হরিণ (সরল রেখায়)
    for (const dir of [-1, 1]) {
      const hx = m + dir * size * 0.26, hy = wy + size * 0.1;
      g.save(); g.translate(hx, hy); g.scale(-dir, 1);
      g.fillStyle = '#5a2a14';
      g.beginPath(); g.ellipse(0, 0, size * 0.06, size * 0.03, 0, 0, 7); g.fill();
      g.fillRect(-size * 0.05, 0, size * 0.012, size * 0.06); g.fillRect(size * 0.035, 0, size * 0.012, size * 0.06);
      g.beginPath(); g.moveTo(size * 0.05, -size * 0.01); g.lineTo(size * 0.075, -size * 0.06); g.lineTo(size * 0.09, -size * 0.05); g.lineTo(size * 0.065, -size * 0.005); g.fill();
      g.strokeStyle = '#5a2a14'; g.lineWidth = size * 0.008; g.beginPath(); g.moveTo(size * 0.078, -size * 0.06); g.lineTo(size * 0.07, -size * 0.09); g.moveTo(size * 0.082, -size * 0.06); g.lineTo(size * 0.095, -size * 0.085); g.stroke();
      g.restore();
    }
    // নিচে লেখার সারি
    g.fillStyle = '#5a2a14';
    for (let i = 0; i < 9; i++) g.fillRect(m - size * 0.2 + i * size * 0.045, m + size * 0.22, size * 0.025, size * (0.025 + (i % 2) * 0.012));
    g.strokeStyle = '#5a2a14'; g.lineWidth = size * 0.01; g.beginPath(); g.moveTo(m - size * 0.25, m + size * 0.18); g.lineTo(m + size * 0.25, m + size * 0.18); g.stroke();
    return c;
  }

  // রয়েল বেঙ্গল টাইগার (উপর থেকে দেখা)
  function tiger(g, x, y, ang, t, moving) {
    g.save(); g.translate(x, y); g.rotate(ang);
    const step = moving ? Math.sin(t * 9) : 0;
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(3, 5, 30, 12, 0, 0, 7); g.fill();
    // পা
    g.fillStyle = '#d06a1c';
    for (const [lx, ly, ph] of [[14, -9, 1], [14, 9, -1], [-14, -9, -1], [-14, 9, 1]]) { g.beginPath(); g.ellipse(lx + step * 4 * ph, ly, 5, 3.5, 0, 0, 7); g.fill(); }
    // লেজ
    g.strokeStyle = '#d97a24'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-24, 0); g.quadraticCurveTo(-36, Math.sin(t * 3) * 10, -44, Math.sin(t * 3 + 1) * 12); g.stroke();
    g.strokeStyle = '#1a1208'; g.lineWidth = 4; g.beginPath(); g.moveTo(-41, Math.sin(t * 3 + 1) * 11); g.lineTo(-44, Math.sin(t * 3 + 1) * 12); g.stroke();
    // শরীর
    const bg = g.createLinearGradient(0, -12, 0, 12);
    bg.addColorStop(0, '#f08a2a'); bg.addColorStop(0.5, '#e57a1f'); bg.addColorStop(1, '#c9661a');
    g.fillStyle = bg; g.beginPath(); g.ellipse(0, 0, 25, 11, 0, 0, 7); g.fill();
    g.strokeStyle = '#1a1208'; g.lineWidth = 2.6;
    for (let k = -18; k <= 16; k += 6) { g.beginPath(); g.moveTo(k, -10); g.quadraticCurveTo(k + 3, -4, k, -1); g.moveTo(k + 1, 10); g.quadraticCurveTo(k + 4, 4, k + 1, 1); g.stroke(); }
    // মাথা
    g.fillStyle = '#ec8226'; g.beginPath(); g.arc(28, 0, 9.5, 0, 7); g.fill();
    g.fillStyle = '#f6efe0'; g.beginPath(); g.ellipse(34, 0, 5, 6, 0, 0, 7); g.fill();
    g.fillStyle = '#ec8226'; g.beginPath(); g.arc(25, -8, 3.5, 0, 7); g.arc(25, 8, 3.5, 0, 7); g.fill();
    g.fillStyle = '#1a1208'; g.beginPath(); g.arc(37, 0, 1.8, 0, 7); g.fill();
    g.fillRect(30, -4.5, 2.2, 2); g.fillRect(30, 2.5, 2.2, 2);
    g.strokeStyle = '#1a1208'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(22, -5); g.lineTo(26, -2); g.moveTo(22, 5); g.lineTo(26, 2); g.stroke();
    g.restore();
  }
  // চিত্রা হরিণ
  function deer(g, x, y, t) {
    const graze = Math.sin(t * 0.7) > 0.3;
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x, y - 2, 16, 5, 0, 0, 7); g.fill();
    g.strokeStyle = '#6e4220'; g.lineWidth = 2.5; for (const lx of [-9, -5, 6, 10]) { g.beginPath(); g.moveTo(x + lx, y - 14); g.lineTo(x + lx, y - 2); g.stroke(); }
    g.fillStyle = '#b8743a'; g.beginPath(); g.ellipse(x, y - 17, 14, 7, 0, 0, 7); g.fill();
    g.fillStyle = '#f3e6c8'; for (const [sx, sy] of [[-6, -19], [-1, -20], [4, -18], [-3, -15], [8, -17], [1, -16]]) { g.beginPath(); g.arc(x + sx, y + sy, 1.3, 0, 7); g.fill(); }
    const hx = x + 14, hy = graze ? y - 8 : y - 26;
    g.strokeStyle = '#b8743a'; g.lineWidth = 5; g.beginPath(); g.moveTo(x + 10, y - 19); g.lineTo(hx, hy + 3); g.stroke();
    g.fillStyle = '#a8662f'; g.beginPath(); g.ellipse(hx + 3, hy, 6, 4, graze ? 0.8 : 0.2, 0, 7); g.fill();
    if (!graze) { g.strokeStyle = '#8a6a44'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(hx, hy - 3); g.lineTo(hx - 3, hy - 13); g.lineTo(hx - 7, hy - 16); g.moveTo(hx - 3, hy - 9); g.lineTo(hx + 2, hy - 13); g.moveTo(hx + 2, hy - 3); g.lineTo(hx + 4, hy - 12); g.stroke(); }
    g.fillStyle = '#f3e6c8'; g.beginPath(); g.ellipse(x - 13, y - 18, 3, 2, 0, 0, 7); g.fill();
  }
  function monkey(g, x, y, t) {
    const b = Math.abs(Math.sin(t * 2)) * 2;
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x, y - 2, 10, 4, 0, 0, 7); g.fill();
    g.strokeStyle = '#8a6a48'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - 6, y - 6); g.quadraticCurveTo(x - 18, y - 10, x - 14, y - 22 + Math.sin(t * 2) * 3); g.stroke();
    g.fillStyle = '#9c7a52'; g.beginPath(); g.ellipse(x, y - 10 - b, 8, 9, 0, 0, 7); g.fill();
    g.fillStyle = '#a8865c'; g.beginPath(); g.arc(x + 1, y - 22 - b, 6.5, 0, 7); g.fill();
    g.fillStyle = '#e0a28a'; g.beginPath(); g.ellipse(x + 2, y - 21 - b, 4, 4.5, 0, 0, 7); g.fill();
    g.fillStyle = '#1a1208'; g.fillRect(x, y - 23 - b, 1.5, 1.5); g.fillRect(x + 3, y - 23 - b, 1.5, 1.5);
    g.fillStyle = '#c8956a'; g.beginPath(); g.arc(x + 9, y - 12 - b, 2.5, 0, 7); g.fill();
  }
  function kingfisher(g, x, y, t) {
    g.strokeStyle = '#6b4a2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 14, y - 6); g.lineTo(x + 14, y - 10); g.stroke();
    const bob = Math.sin(t * 5) > 0.85 ? 2 : 0;
    g.fillStyle = '#e07b39'; g.beginPath(); g.ellipse(x, y - 14 + bob, 5, 6, 0, 0, 7); g.fill();
    g.fillStyle = '#1f7ab8'; g.beginPath(); g.ellipse(x - 2, y - 16 + bob, 5, 6.5, -0.4, 0, 7); g.fill();
    g.fillStyle = '#3aa0e0'; g.beginPath(); g.arc(x + 1, y - 22 + bob, 4.2, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.fillRect(x + 1, y - 20 + bob, 3, 2);
    g.fillStyle = '#c0392b'; g.beginPath(); g.moveTo(x + 4, y - 23 + bob); g.lineTo(x + 13, y - 21 + bob); g.lineTo(x + 4, y - 20 + bob); g.fill();
    g.fillStyle = '#1a1208'; g.fillRect(x + 2, y - 23 + bob, 1.4, 1.4);
  }
  function crab(g, x, y, t) {
    const sx = Math.sin(t * 2.5) * 5;
    g.save(); g.translate(x + sx, y - 6);
    g.strokeStyle = '#a8321e'; g.lineWidth = 1.4;
    for (const sgn of [-1, 1]) for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(sgn * 4, k * 2 - 1); g.lineTo(sgn * 10, k * 3 + 1); g.stroke(); }
    g.fillStyle = '#d63b2a'; g.beginPath(); g.ellipse(0, 0, 7, 5, 0, 0, 7); g.fill();
    g.fillStyle = '#f0c040'; g.beginPath(); g.ellipse(9, -6, 6, 3.5, -0.5, 0, 7); g.fill();
    g.fillStyle = '#1a1208'; g.beginPath(); g.arc(-2, -5, 1.2, 0, 7); g.arc(2, -5, 1.2, 0, 7); g.fill();
    g.restore();
  }
  // মৌয়ালের ধোঁয়ার কুণ্ডলী
  function smoker(g, x, y, t) {
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x, y - 2, 12, 4, 0, 0, 7); g.fill();
    g.fillStyle = '#8a6a3a'; g.beginPath(); g.ellipse(x, y - 8, 11, 6, 0.2, 0, 7); g.fill();
    g.strokeStyle = '#5a4020'; g.lineWidth = 1; for (let k = -8; k < 9; k += 3) { g.beginPath(); g.moveTo(x + k, y - 13); g.lineTo(x + k + 2, y - 3); g.stroke(); }
    for (let i = 0; i < 4; i++) { const ph = (t * 0.6 + i / 4) % 1; g.fillStyle = `rgba(220,220,220,${0.4 * (1 - ph)})`; g.beginPath(); g.arc(x + 6 + Math.sin(ph * 6 + i) * 4, y - 14 - ph * 30, 3 + ph * 7, 0, 7); g.fill(); }
  }

  // ঠেলার মতো চারকোনা পাথর
  function stoneBlock(g, x, y, onPlate) {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + 6, y + 10, T - 6, T - 8);
    const gr = g.createLinearGradient(x, y, x + T, y + T);
    gr.addColorStop(0, onPlate ? '#d9cfb0' : '#bdb5a3'); gr.addColorStop(1, onPlate ? '#a8996e' : '#8a8274');
    g.fillStyle = gr; rrect(g, x + 3, y - 6, T - 6, T - 4, 5); g.fill();
    g.fillStyle = onPlate ? '#8a7b52' : '#6e675b'; g.fillRect(x + 3, y + T - 18, T - 6, 8);
    g.strokeStyle = 'rgba(60,55,45,0.5)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x + 10, y + 2); g.lineTo(x + 18, y + 12); g.lineTo(x + 14, y + 20); g.moveTo(x + T - 12, y); g.lineTo(x + T - 18, y + 10); g.stroke();
    if (onPlate) { g.strokeStyle = 'rgba(242,193,78,0.9)'; g.lineWidth = 2.5; rrect(g, x + 3, y - 6, T - 6, T - 4, 5); g.stroke(); }
  }
  // খোদার পাথর: বিশাল কালো পাথরের ফলক
  function bigSlab(g, x, y) {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x + T / 2 + 6, y + T - 4, T * 0.6, 10, 0, 0, 7); g.fill();
    const gr = g.createLinearGradient(x, y, x + T, y);
    gr.addColorStop(0, '#5a5652'); gr.addColorStop(1, '#2e2b28');
    g.fillStyle = gr; rrect(g, x - 4, y + 6, T + 8, T - 12, 6); g.fill();
    g.fillStyle = '#6e6964'; rrect(g, x - 4, y + 2, T + 8, 12, 5); g.fill();
    g.fillStyle = 'rgba(242,193,78,0.6)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(x + 4 + i * 10, y + 8, 1.4, 0, 7); g.fill(); }
    g.fillStyle = '#d8d0b8'; g.beginPath(); g.arc(x + T / 2, y + 7, 3, 0, 7); g.fill(); // ফুল-প্রদীপের দাগ
  }
  // পাথরের দরজা (খুললে নিচে নেমে যায়)
  function stoneDoor(g, x, y, open, t) {
    g.fillStyle = '#7a3a24'; g.fillRect(x - 4, y - T * 0.5, 8, T * 1.5); g.fillRect(x + T - 4, y - T * 0.5, 8, T * 1.5);
    g.fillRect(x - 4, y - T * 0.6, T + 8, 10);
    if (open) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 4, y + T - 10, T - 8, 6); return; }
    const gr = g.createLinearGradient(x, 0, x + T, 0);
    gr.addColorStop(0, '#9e978a'); gr.addColorStop(0.5, '#bdb5a3'); gr.addColorStop(1, '#7d766a');
    g.fillStyle = gr; g.fillRect(x + 4, y - T * 0.45, T - 8, T * 1.4);
    g.strokeStyle = 'rgba(60,55,45,0.6)'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(x + T / 2, y + T * 0.2, 9, 0, 7); g.stroke();
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x + T / 2 - 12 + i * 12, y + T * 0.7, 3, 0, 7); g.stroke(); }
  }
  // জিয়ৎ কুণ্ড (প্রাচীন কূপ)
  function well(g, x, y, t) {
    const cx = x + T / 2, cy = y + T / 2;
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(cx + 4, cy + 8, 26, 12, 0, 0, 7); g.fill();
    g.fillStyle = '#9c5238'; g.beginPath(); g.ellipse(cx, cy + 4, 26, 13, 0, 0, 7); g.fill();
    g.fillStyle = '#b8684a'; g.beginPath(); g.ellipse(cx, cy, 26, 13, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(80,30,15,0.4)'; g.lineWidth = 1; for (let a = 0; a < 6.28; a += 0.4) { g.beginPath(); g.moveTo(cx + Math.cos(a) * 18, cy + Math.sin(a) * 9); g.lineTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 13); g.stroke(); }
    g.fillStyle = '#1e3a40'; g.beginPath(); g.ellipse(cx, cy, 17, 8.5, 0, 0, 7); g.fill();
    g.fillStyle = `rgba(160,220,230,${0.25 + Math.sin(t * 2) * 0.1})`; g.beginPath(); g.ellipse(cx - 4, cy - 2, 7, 2.5, 0, 0, 7); g.fill();
  }
  // মহাস্থান ব্রাহ্মী শিলালিপির প্রতিরূপ (টুকরো-ধাঁধার ছবি)
  function brahmiPlaque(size) {
    const c = canvas(size, size), g = c.getContext('2d'), r = rng(42);
    g.fillStyle = '#3a2a1a'; g.fillRect(0, 0, size, size);
    const gr = g.createLinearGradient(0, 0, size, size);
    gr.addColorStop(0, '#d8d0bc'); gr.addColorStop(1, '#a89e88');
    g.fillStyle = gr; g.beginPath();
    g.moveTo(size * 0.06, size * 0.1); g.lineTo(size * 0.9, size * 0.05); g.lineTo(size * 0.95, size * 0.55); g.lineTo(size * 0.88, size * 0.93); g.lineTo(size * 0.12, size * 0.95); g.lineTo(size * 0.04, size * 0.6); g.closePath(); g.fill();
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(90,80,60,${r() * 0.15})`; g.beginPath(); g.arc(r() * size, r() * size, 2 + r() * 10, 0, 7); g.fill(); }
    // সাত সারি খোদাই করা অক্ষর (ব্রাহ্মীর আদলে)
    g.strokeStyle = '#4a3f30'; g.lineWidth = size * 0.009; g.lineCap = 'round';
    for (let row = 0; row < 7; row++) {
      const yy = size * (0.17 + row * 0.11);
      for (let k = 0; k < 9; k++) {
        const xx = size * (0.12 + k * 0.088), h = size * 0.06;
        g.beginPath();
        const sh = Math.floor(r() * 9);
        if (sh === 0) { g.moveTo(xx, yy); g.lineTo(xx, yy + h); g.moveTo(xx - h * 0.3, yy + h * 0.5); g.lineTo(xx + h * 0.3, yy + h * 0.5); }
        else if (sh === 1) { g.arc(xx, yy + h * 0.5, h * 0.35, 0, 7); }
        else if (sh === 2) { g.moveTo(xx - h * 0.3, yy); g.lineTo(xx, yy + h); g.lineTo(xx + h * 0.3, yy); }
        else if (sh === 3) { g.moveTo(xx - h * 0.3, yy + h); g.lineTo(xx - h * 0.3, yy); g.lineTo(xx + h * 0.3, yy); g.lineTo(xx + h * 0.3, yy + h); }
        else if (sh === 4) { g.moveTo(xx, yy); g.lineTo(xx, yy + h); g.moveTo(xx, yy + h * 0.3); g.lineTo(xx + h * 0.35, yy); }
        else if (sh === 5) { g.moveTo(xx - h * 0.3, yy + h * 0.5); g.lineTo(xx + h * 0.3, yy + h * 0.5); g.moveTo(xx, yy); g.lineTo(xx, yy + h * 0.5); }
        else if (sh === 6) { g.moveTo(xx - h * 0.3, yy); g.lineTo(xx + h * 0.3, yy); g.lineTo(xx - h * 0.3, yy + h); g.lineTo(xx + h * 0.3, yy + h); }
        else if (sh === 7) { g.arc(xx, yy + h * 0.3, h * 0.25, Math.PI, 0); g.moveTo(xx, yy + h * 0.3); g.lineTo(xx, yy + h); }
        else { g.moveTo(xx - h * 0.3, yy + h); g.quadraticCurveTo(xx, yy - h * 0.2, xx + h * 0.3, yy + h); g.moveTo(xx - h * 0.15, yy + h * 0.65); g.lineTo(xx + h * 0.15, yy + h * 0.65); }
        g.stroke();
      }
    }
    // ফাটল
    g.strokeStyle = 'rgba(40,30,20,0.6)'; g.lineWidth = size * 0.006;
    g.beginPath(); g.moveTo(size * 0.6, size * 0.06); g.lineTo(size * 0.55, size * 0.3); g.lineTo(size * 0.62, size * 0.5); g.lineTo(size * 0.58, size * 0.75); g.stroke();
    return c;
  }

  // কুমির: surf 0 = ডুবে আছে (শুধু চোখ), 1 = ভেসে উঠেছে
  function croc(g, x, y, ang, surf, t) {
    g.save(); g.translate(x, y); g.rotate(ang);
    // ঢেউয়ের রেখা
    g.strokeStyle = 'rgba(220,245,240,0.5)'; g.lineWidth = 1.5;
    for (let i = 1; i <= 3; i++) { const k = ((t * 1.2 + i / 3) % 1); g.globalAlpha = 1 - k; g.beginPath(); g.moveTo(-30 - k * 26, -8 - k * 10); g.quadraticCurveTo(-20 - k * 16, 0, -30 - k * 26, 8 + k * 10); g.stroke(); }
    g.globalAlpha = 1;
    if (surf > 0.2) {
      g.globalAlpha = Math.min(1, surf);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(2, 4, 34, 9, 0, 0, 7); g.fill();
      const sway = Math.sin(t * 4) * 4;
      g.fillStyle = '#3f5a2a';
      g.beginPath(); g.moveTo(-34, sway); g.quadraticCurveTo(-18, -7, 4, -8); g.quadraticCurveTo(22, -7, 34, -2); g.lineTo(36, 2); g.quadraticCurveTo(22, 7, 4, 8); g.quadraticCurveTo(-18, 7, -34, sway); g.fill();
      g.fillStyle = '#56763a'; for (let k = -24; k < 16; k += 6) { g.beginPath(); g.moveTo(k, -3); g.lineTo(k + 3, -6); g.lineTo(k + 6, -3); g.fill(); }
      g.fillStyle = '#2f4520';
      for (const sy of [-1, 1]) { g.beginPath(); g.ellipse(-6, sy * 9, 5, 2.5, sy * 0.6, 0, 7); g.fill(); g.beginPath(); g.ellipse(14, sy * 8, 4, 2.2, -sy * 0.6, 0, 7); g.fill(); }
      g.globalAlpha = 1;
    }
    // চোখ (সবসময় দেখা যায়)
    g.fillStyle = '#4d6a32'; g.beginPath(); g.ellipse(24, -4, 4, 3, 0, 0, 7); g.ellipse(24, 4, 4, 3, 0, 0, 7); g.fill();
    g.fillStyle = '#e8c547'; g.beginPath(); g.arc(25, -4, 1.8, 0, 7); g.arc(25, 4, 1.8, 0, 7); g.fill();
    g.fillStyle = '#111'; g.fillRect(24.6, -5.5, 0.9, 3); g.fillRect(24.6, 2.5, 0.9, 3);
    g.restore();
  }

  function cloud() {
    const c = canvas(520, 300), g = c.getContext('2d');
    for (let i = 0; i < 7; i++) {
      const x = 120 + Math.random() * 280, y = 100 + Math.random() * 100, r = 70 + Math.random() * 60;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(10,25,40,0.5)'); gr.addColorStop(1, 'rgba(10,25,40,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 520, 300);
    }
    return c;
  }

  return { T, rng, canvas, rrect, ground, treeSprite, building, gateSprite, stele, explorer, caretaker, kid, pigeon, butterfly, medallion, cloud, person, boat, alleyGate, loom, kantha, tent, trench, findsTable, cellMark, seal, croc, tiger, deer, monkey, kingfisher, crab, smoker, stoneBlock, bigSlab, stoneDoor, well, brahmiPlaque };
})();
