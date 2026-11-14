// লেভেল ইঞ্জিন: হাঁটা, কুয়াশা, কথা বলা, ধাঁধা, খোঁড়া, শব্দ আর জীবন্ত পরিবেশ
window.LEVELS = window.LEVELS || {};

window.LevelGame = (function () {
  const T = Art.T;
  const WALK = 0.16, RUN = 0.095; // এক ঘর যেতে কত সেকেন্ড
  const SIGHT = 5;
  const FOGRES = 3;
  const DIGGABLE = new Set(['g', 'f']);
  const SOLID_TILES = new Set(['#', 'w', 'c', 'k', 'r']);
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };

  const $ = (id) => document.getElementById(id);
  const root = $('level');
  const canvas = $('level-canvas');
  const ctx = canvas.getContext('2d');
  const bn = (n) => BN_DIGITS(n);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const touch = matchMedia('(pointer: coarse)').matches;

  let L = null;
  let raf = 0, last = 0, W = 0, H = 0, dpr = 1, scale = 1;
  let held = [];
  let shift = false;
  let cb = {};
  let mouse = null; // {sx, sy}
  const cloudImg = Art.cloud();

  // ---------- আকার ----------
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const tile = Math.max(36, Math.min(66, Math.min(W / 15, H / 10.5)));
    scale = tile / T;
  }

  // ---------- লেভেল তৈরি ----------
  function build(def, site) {
    const m = def.build();
    const C = m.cols, R = m.rows;
    const at = (x, y) => (x < 0 || y < 0 || x >= C || y >= R ? '#' : m.tiles[y][x]);
    const lv = {
      def, site, C, R, at, m,
      objects: m.objects,
      player: { x: m.start.x, y: m.start.y, dir: 'up', path: [], to: null, from: null, k: 0, pending: null, digT: null, run: false, stepDur: WALK },
      cam: { x: m.start.x * T, y: m.start.y * T },
      explored: new Uint8Array(C * R),
      solid: new Uint8Array(C * R),
      holes: [], particles: [], items: [], done: new Set(), clues: [], flags: {},
      digs: def.digs || 5, digsMax: def.digs || 5, coins: 0, time: 0,
      busy: false, mode: 'play', dialog: null, circle: null, chest: null, t: 0,
      pigeons: [], butterflies: [], clouds: [],
    };
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) if (SOLID_TILES.has(at(x, y))) lv.solid[y * C + x] = 1;
    for (const o of lv.objects) {
      o.w = o.w || 1; o.h = o.h || 1;
      if (o.kind === 'door' && o.open) o.solid = false;
      if (o.solid !== false && o.kind !== 'coin' && o.kind !== 'decor') for (let yy = o.y; yy < o.y + o.h; yy++) for (let xx = o.x; xx < o.x + o.w; xx++) lv.solid[yy * C + xx] = 1;
      if (o.kind === 'building') o.sprite = Art.building(o.style, o.w, o.h, o.variant || 1);
      if (o.kind === 'tree') o.sprite = Art.treeSprite(o.style, o.x * 31 + o.y * 17);
      if (o.kind === 'stele') o.sprite = Art.stele();
      if (o.kind === 'gate') o.sprite = Art.gateSprite(o.w);
    }
    lv.ground = Art.ground(m.tiles, C, R);
    lv.fog = Art.canvas(C * FOGRES, R * FOGRES);
    lv.fogCtx = lv.fog.getContext('2d');
    lv.fogImg = lv.fogCtx.createImageData(C * FOGRES, R * FOGRES);

    // জীবন্ত পরিবেশ
    for (const f of m.flocks || []) {
      for (let i = 0; i < f.n; i++) {
        lv.pigeons.push({ x: (f.x + Math.random() * f.w) * T, y: (f.y + Math.random() * f.h) * T, z: 0, vx: 0, vy: 0, vz: 0, dir: Math.random() < 0.5 ? 1 : -1, state: 'peck', t: Math.random() * 3, seed: Math.random() * 10, home: f });
      }
    }
    const beds = [];
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) if (at(x, y) === 'f' && at(x - 1, y) !== 'f' && at(x, y - 1) !== 'f') beds.push([x + 1, y + 1]);
    const BCOL = ['#f5a623', '#fbe36b', '#ffffff', '#7fb3ff', '#ff8fb8'];
    for (let i = 0; i < Math.min(7, beds.length); i++) {
      const [bx, by] = beds[(Math.random() * beds.length) | 0];
      lv.butterflies.push({ cx: bx * T, cy: by * T - 10, x: 0, y: 0, seed: Math.random() * 20, color: BCOL[i % BCOL.length], r: 30 + Math.random() * 40 });
    }
    for (let i = 0; i < 3; i++) lv.clouds.push({ x: Math.random() * C * T, y: Math.random() * R * T, s: 1.4 + Math.random() * 1.2, v: 10 + Math.random() * 8 });
    lv.waterSpots = lv.objects.filter((o) => o.kind === 'fountain' || o.water).map((o) => [o.x, o.y]);
    return lv;
  }

  const idx = (x, y) => y * L.C + x;
  const walkable = (x, y) => x >= 0 && y >= 0 && x < L.C && y < L.R && !L.solid[idx(x, y)];
  const objectAt = (x, y) => L.objects.find((o) => o.kind !== 'coin' && !o.hidden && x >= o.x && x < o.x + o.w && y >= o.y - (o.kind === 'building' || o.kind === 'npc' || o.kind === 'door' ? 1 : 0) && y < o.y + o.h);
  const has = (id) => L.items.some((i) => i.id === id);

  function findPath(sx, sy, isGoal) {
    const prev = new Int32Array(L.C * L.R).fill(-1);
    const q = [idx(sx, sy)];
    prev[q[0]] = q[0];
    let head = 0;
    while (head < q.length) {
      const cur = q[head++];
      const cx = cur % L.C, cy = (cur / L.C) | 0;
      if (isGoal(cx, cy)) {
        const path = [];
        let k = cur;
        while (k !== idx(sx, sy)) { path.unshift([k % L.C, (k / L.C) | 0]); k = prev[k]; }
        return path;
      }
      for (const [dx, dy] of Object.values(DIRS)) {
        const nx = cx + dx, ny = cy + dy;
        if (!walkable(nx, ny) || prev[idx(nx, ny)] !== -1) continue;
        prev[idx(nx, ny)] = cur;
        q.push(idx(nx, ny));
      }
    }
    return null;
  }

  function approachTiles(o) {
    if (o.door) return [[o.door.x, o.door.y]];
    const out = [];
    for (let yy = o.y; yy < o.y + o.h; yy++) for (let xx = o.x; xx < o.x + o.w; xx++)
      for (const [dx, dy] of Object.values(DIRS)) if (walkable(xx + dx, yy + dy)) out.push([xx + dx, yy + dy]);
    return out;
  }
  const isNear = (o, x, y) => approachTiles(o).some(([ax, ay]) => ax === x && ay === y);

  function nearbyInteractable() {
    const p = L.player;
    if (p.to) return null;
    return L.objects.find((o) => o.interact && !o.hidden && isNear(o, p.x, p.y));
  }

  // ---------- এপিআই: লেভেল স্ক্রিপ্ট এটা ব্যবহার করে ----------
  const api = {
    get L() { return L; },
    // lines: [{who, text, choices?}] — শেষ লাইনে choices থাকলে বেছে নেওয়া উত্তরের ক্রম ফেরত দেয়
    say(lines) {
      return new Promise((res) => {
        L.dialog = { lines, i: 0, shown: 0, res, choice: undefined };
        L.busy = true;
        Sound.sfx('page');
        renderDialog();
        $('lv-dialog').classList.add('show');
      });
    },
    give(item) {
      if (has(item.id)) return;
      L.items.push(item);
      renderInventory(item.id);
      floatText(L.player.x, L.player.y, `${item.icon} ${item.name}`);
      sparkle(L.player.x, L.player.y, 18);
      Sound.sfx('pickup');
      if (item.id === 'compass' && cluesLeft() > 0) setTimeout(() => L && toast('🧭 কম্পাসটা এখন <b>ঘুমিয়ে</b> আছে। সব কাজ আর সূত্র শেষ করলে তবেই জেগে উঠে গুপ্তধনের দিক বলবে।', 4200), 600);
    },
    has,
    take(id) { L.items = L.items.filter((i) => i.id !== id); renderInventory(); },
    complete(id) { L.done.add(id); renderObjectives(); },
    isDone: (id) => L.done.has(id),
    clue(text) { L.clues.push(text); renderObjectives(); },
    toast,
    quiz: (q) => openQuiz(q),
    lock: (o) => openLock(o),
    tiles: (o) => openTiles(o),
    bells: (o) => openBells(o),
    memory: (o) => openMemory(o),
    view: (o) => openView(o),
    openDoor(id) {
      const o = L.objects.find((x) => x.id === id);
      if (!o || o.open) return;
      o.open = true; o.interact = false; o.bubble = null;
      for (let yy = o.y; yy < o.y + o.h; yy++) for (let xx = o.x; xx < o.x + o.w; xx++) L.solid[idx(xx, yy)] = SOLID_TILES.has(L.at(xx, yy)) ? 1 : 0;
      sparkle(o.x, o.y, 14);
      Sound.sfx('unlock');
    },
    showCircle(c) { L.circle = Object.assign({ t: 0 }, c); Sound.sfx('whoosh'); },
    addDigs(n) { L.digs += n; L.digsMax += n; renderStats(); },
    order: (o) => openOrder(o),
    // খেলোয়াড়কে অন্য ঘরে সরিয়ে দেওয়া (যেমন কুমিরের তাড়া খেয়ে)
    teleport(x, y) { const p = L.player; p.x = x; p.y = y; p.to = null; p.path = []; p.pending = null; L.marker = null; held = []; },
    splash(x, y) {
      for (let i = 0; i < 22; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, s = 60 + Math.random() * 90; L.particles.push({ kind: 'spark', x: x * T + T / 2, y: y * T + T / 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.4, color: Math.random() < 0.5 ? '#cfeef0' : '#7fb7c0', size: 2 + Math.random() * 3, grav: 420 }); }
      Sound.sfx('splash');
    },
    playerPos: () => playerPos(),
    hud(html) { const h = $('lv-custom'); h.innerHTML = html || ''; h.classList.toggle('show', !!html); },
    revealAll() { L.explored.fill(1); },
    slide: (o) => openSlide(o),
    idx: (x, y) => idx(x, y),
    floatText: (x, y, t, c) => floatText(x, y, t, c),
    flag: (k, v) => (v === undefined ? L.flags[k] : (L.flags[k] = v)),
    rand: Math.random,
  };

  // ---------- টোস্ট ও ভাসমান লেখা ----------
  let toastTimer;
  function toast(html, ms = 2800) {
    const t = $('lv-toast');
    t.innerHTML = html;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }
  function floatText(x, y, text, color = '#fff1b8') {
    L.particles.push({ kind: 'text', x: x * T + T / 2, y: y * T - 10, vy: -26, life: 1.6, text, color });
  }
  function sparkle(x, y, n = 12, colors = ['#fff1b8', '#f2c14e', '#ffffff']) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, s = 30 + Math.random() * 70;
      L.particles.push({ kind: 'spark', x: x * T + T / 2, y: y * T + T / 2 - 14, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0.6 + Math.random() * 0.6, color: colors[i % colors.length], size: 2 + Math.random() * 2.5 });
    }
  }
  function dirt(x, y) {
    for (let i = 0; i < 18; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, s = 50 + Math.random() * 80;
      L.particles.push({ kind: 'spark', x: x * T + T / 2, y: y * T + T * 0.75, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.4, color: Math.random() < 0.5 ? '#6b4423' : '#8a5a33', size: 2.5 + Math.random() * 2.5, grav: 380 });
    }
  }
  function puff(wx, wy, color = 'rgba(214,174,134,0.55)') {
    for (let i = 0; i < 3; i++) L.particles.push({ kind: 'puff', x: wx + (Math.random() - 0.5) * 10, y: wy + (Math.random() - 0.5) * 4, r: 2 + Math.random() * 2, life: 0.45, color, vx: (Math.random() - 0.5) * 14, vy: -6 });
  }

  // ---------- ইন্টার‍্যাকশন ----------
  async function interact(o) {
    if (L.busy || L.mode !== 'play') return;
    const p = L.player;
    const [ox, oy] = [o.x + (o.w - 1) / 2, o.y + o.h - 1];
    if (Math.abs(ox - p.x) > Math.abs(oy - p.y)) p.dir = ox > p.x ? 'right' : 'left';
    else p.dir = oy > p.y ? 'down' : 'up';
    if (o.push) { // পাথর ঠেলা: খেলোয়াড় থেকে পাথরের দিকে
      const dx = Math.sign(o.x - p.x), dy = Math.sign(o.y - p.y);
      const ox0 = o.x, oy0 = o.y;
      if ((dx === 0) !== (dy === 0) && tryPush(o, dx, dy)) p.path = [[ox0, oy0]];
      return;
    }
    L.busy = true;
    try { await L.def.interact[o.id](api, o); } finally { if (L && !L.dialog) L.busy = false; }
  }

  function tryPush(o, dx, dy) {
    const nx = o.x + dx, ny = o.y + dy;
    const blocked = !walkable(nx, ny) || (L.player.x === nx && L.player.y === ny);
    if (blocked) { Sound.sfx('tick'); toast(L.def.pushBlocked || 'পাথরটা ওদিকে আর সরবে না।', 1600); return false; }
    L.solid[idx(o.x, o.y)] = 0;
    o.from = [o.x, o.y]; o.x = nx; o.y = ny; o.k = 0;
    L.solid[idx(nx, ny)] = 1;
    Sound.sfx('push');
    puff(o.from[0] * T + T / 2, (o.from[1] + 1) * T - 6, 'rgba(190,170,140,0.6)');
    if (L.def.onPush) L.def.onPush(api, o);
    return true;
  }

  function goTo(x, y, target) {
    const p = L.player;
    const sx = p.to ? p.to[0] : p.x, sy = p.to ? p.to[1] : p.y;
    let path;
    if (target) {
      const goals = approachTiles(target);
      if (goals.some(([gx, gy]) => gx === p.x && gy === p.y) && !p.to) { interact(target); return; }
      path = findPath(sx, sy, (cx, cy) => goals.some(([gx, gy]) => gx === cx && gy === cy));
      if (path) { p.path = path; p.pending = target; }
    } else {
      if (!walkable(x, y)) return;
      path = findPath(sx, sy, (cx, cy) => cx === x && cy === y);
      if (path) { p.path = path; p.pending = null; L.marker = { x, y, t: 0 }; }
    }
    if (path) p.run = path.length > 6; // দূরে গেলে দৌড়
  }

  // কম্পাস শুধু তখনই কাজ করে যখন সব জরুরি সূত্র মেলানো হয়ে গেছে (খোঁড়া ছাড়া)
  function cluesLeft() {
    return L.def.objectives.filter((o) => !o.optional && o.id !== 'dig' && !L.done.has(o.id)).length;
  }
  function compassAwake() { return has('compass') && cluesLeft() === 0; }

  function heat() {
    const p = L.player, tr = L.treasure;
    const d = Math.hypot(p.x - tr.x, p.y - tr.y);
    // ইচ্ছে করেই মোটা দাগের: "গরম" অনেকগুলো ঘর জুড়ে, ঠিক ঘরটা খুঁজতে খোঁড়ার পরের দিক-সংকেত লাগবে
    if (d <= 3) return { lv: 3, text: 'গরম', d };
    if (d <= 5) return { lv: 2, text: 'উষ্ণ', d };
    if (d <= 8) return { lv: 1, text: 'ঠান্ডা', d };
    return { lv: 0, text: 'বরফ ঠান্ডা', d };
  }

  // গর্তের পাশে মাটিতে আঁকা দিক-তীর
  const ARROW_ANG = { '→': 0, '↘': 1, '↓': 2, '↙': 3, '←': 4, '↖': 5, '↑': 6, '↗': 7 };
  function holeArrow(g, cx, cy, ar, k) {
    g.save(); g.translate(cx, cy); g.rotate(ARROW_ANG[ar] * Math.PI / 4); g.scale(k, k);
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [col, lw] of [['rgba(40,20,5,0.85)', 7], ['#ffd36b', 3.5]]) {
      g.strokeStyle = col; g.lineWidth = lw;
      g.beginPath(); g.moveTo(10, 0); g.lineTo(26, 0); g.moveTo(20, -6); g.lineTo(27, 0); g.lineTo(20, 6); g.stroke();
    }
    g.restore();
  }

  // খোঁড়া জায়গা থেকে ধন কোন দিকে (উপর = উত্তর)
  function treasureDir(x, y) {
    const a = Math.atan2(L.treasure.y - y, L.treasure.x - x);
    const k = (Math.round(a / (Math.PI / 4)) + 8) % 8;
    return [['পূর্ব', '→'], ['দক্ষিণ-পূর্ব', '↘'], ['দক্ষিণ', '↓'], ['দক্ষিণ-পশ্চিম', '↙'], ['পশ্চিম', '←'], ['উত্তর-পশ্চিম', '↖'], ['উত্তর', '↑'], ['উত্তর-পূর্ব', '↗']][k];
  }

  async function dig() {
    if (L.busy || L.mode !== 'play') return;
    const p = L.player;
    if (p.to || p.path.length) return;
    if (!has('shovel')) { toast('খুঁড়তে <b>কোদাল</b> লাগবে। মালির ঘরে খুঁজে দেখো।'); Sound.sfx('wrong'); return; }
    const t = L.at(p.x, p.y);
    const digSet = L.def.diggable ? new Set(L.def.diggable) : DIGGABLE;
    if (!digSet.has(t)) { toast(L.def.digHint || 'এখানে খোঁড়া যাবে না। <b>ঘাস বা ফুলের বাগানে</b> দাঁড়িয়ে খোঁড়ো।'); Sound.sfx('wrong'); return; }
    if (L.holes.some((h) => h.x === p.x && h.y === p.y)) { toast('এই জায়গা তো আগেই খুঁড়েছ!'); return; }
    L.busy = true;
    p.digT = 0;
    Sound.sfx('dig');
    await wait(750);
    if (!L) return;
    p.digT = null;
    L.digs--;
    L.holes.push({ x: p.x, y: p.y, t: 0 });
    dirt(p.x, p.y);
    L.shake = 0.25;
    renderStats();
    if (p.x === L.treasure.x && p.y === L.treasure.y) { win(); return; }
    const misses = ['শুধু মাটি আর পুরনো ইটের টুকরো…', 'একটা কেঁচো ছাড়া কিছু নেই!', 'মাটি শক্ত, কিন্তু ধন নেই।', 'ভাঙা মাটির হাঁড়ির টুকরো… ধন নয়।'];
    let msg = misses[(Math.random() * misses.length) | 0];
    if (compassAwake()) {
      const [dn, ar] = treasureDir(p.x, p.y);
      L.holes[L.holes.length - 1].dir = ar;
      msg += ` 🧭 কম্পাসের কাঁটা ঘুরে গেল: ধন এখান থেকে <b>${ar} ${dn}</b> দিকে।`;
      floatText(p.x, p.y - 0.6, `${ar} ${dn}`, '#ffd36b');
    }
    if (L.digs <= 0) { toast(msg, 4000); setTimeout(lose, 1600); return; }
    toast(msg + ` · আর <b>${bn(L.digs)}</b> বার খোঁড়া যাবে`, 5200);
    L.busy = false;
  }

  function win() {
    L.mode = 'won';
    L.busy = true;
    L.done.add('dig');
    renderObjectives();
    L.chest = { x: L.treasure.x, y: L.treasure.y, t: 0 };
    Sound.sfx('chest');
    setTimeout(() => {
      if (!L) return;
      const [sx, sy] = toScreen(L.treasure.x * T + T / 2, L.treasure.y * T + T / 2);
      FX.burst(sx, sy - 20, 120);
    }, 1100);
    setTimeout(showResult, 2800);
  }
  function lose() {
    if (!L) return;
    L.mode = 'lost';
    Sound.sfx('fail');
    openModal(`
      <div class="lv-modal-icon">⛏💔</div>
      <h3>কোদাল ভেঙে গেছে!</h3>
      <p>আর খোঁড়ার উপায় নেই। গুপ্তধন লুকিয়েই রইল… আবার চেষ্টা করবে?</p>
      <div class="lv-modal-actions">
        <button class="btn-primary" data-act="retry">আবার চেষ্টা করো</button>
        <button class="btn-ghost" data-act="map">ম্যাপে ফিরে যাও</button>
      </div>`, (act) => { closeModal(); if (act === 'retry') restart(); else exit(); });
  }

  // ---------- আপডেট ----------
  function update(dt) {
    L.t += dt;
    if (L.mode === 'play' && !L.titleT) L.time += dt;
    if (L.titleT) L.titleT = Math.max(0, L.titleT - dt);
    const p = L.player;

    if (p.to) {
      p.k += dt / p.stepDur;
      if (p.k >= 1) { p.x = p.to[0]; p.y = p.to[1]; p.to = null; p.k = 0; arrive(); }
    }
    if (!p.to && !L.busy && L.mode === 'play') {
      let next = null;
      const k = held[held.length - 1];
      if (k) {
        p.path = []; p.pending = null; L.marker = null; p.run = shift;
        p.dir = k;
        const n = [p.x + DIRS[k][0], p.y + DIRS[k][1]];
        if (walkable(n[0], n[1])) next = n;
        else {
          const blk = L.objects.find((o) => o.push && !o.hidden && o.x === n[0] && o.y === n[1]);
          if (blk && (blk.k === undefined || blk.k >= 1) && tryPush(blk, DIRS[k][0], DIRS[k][1])) next = n;
        }
      } else if (p.path.length) next = p.path.shift();
      if (next) {
        const dx = next[0] - p.x, dy = next[1] - p.y;
        p.dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
        p.from = [p.x, p.y]; p.to = next; p.k = 0;
        p.stepDur = p.run || shift ? RUN : WALK;
      } else if (p.pending) {
        const o = p.pending; p.pending = null; L.marker = null;
        interact(o);
      } else { L.marker = null; p.run = false; }
    }
    if (p.digT != null) p.digT += dt;

    const [rx, ry] = playerPos();
    // ক্যামেরা: চলার দিকে একটু এগিয়ে থাকে; কথোপকথনের সময় নিচে নামে
    const lead = p.to ? 0.9 : 0;
    const lx = (DIRS[p.dir][0] * lead) * T, ly = (DIRS[p.dir][1] * lead) * T;
    const lift = (L.dialog ? 120 : touch ? 70 : 0) / scale;
    L.cam.x += (rx * T + T / 2 + lx - L.cam.x) * Math.min(1, dt * 5);
    L.cam.y += (ry * T + ly + lift - L.cam.y) * Math.min(1, dt * 5);
    if (L.shake) L.shake = Math.max(0, L.shake - dt);

    updateLife(dt, rx, ry);
    if (L.def.update && L.mode === 'play') L.def.update(api, dt);

    for (const pt of L.particles) {
      pt.life -= dt;
      if (pt.kind === 'text') pt.y += pt.vy * dt;
      else if (pt.kind === 'puff') { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.r += dt * 14; }
      else if (pt.kind === 'leaf') { pt.y += pt.vy * dt; pt.x += Math.sin(L.t * 2 + pt.seed) * 18 * dt; pt.rot += dt * 2; }
      else { pt.vy += (pt.grav || 160) * dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; }
    }
    L.particles = L.particles.filter((pt) => pt.life > 0);
    for (const o of L.objects) if (o.push && o.k !== undefined && o.k < 1) o.k = Math.min(1, o.k + dt / 0.16);
    if (L.circle) L.circle.t += dt;
    if (L.chest) L.chest.t += dt;
    if (L.marker) L.marker.t += dt;

    if (L.dialog) {
      const d = L.dialog, line = d.lines[d.i];
      if (d.shown < line.text.length) {
        const before = Math.floor(d.shown);
        d.shown = Math.min(line.text.length, d.shown + dt * 46);
        for (let i = before; i < Math.floor(d.shown); i++) Sound.voice.char(line.text, i, line.who);
        renderDialogText();
      }
    }
    updateFog(rx, ry);
    updateCompass();
    // পানির শব্দ: ফোয়ারার কাছে গেলে জোরে
    if (L.waterSpots.length) {
      const dmin = Math.min(...L.waterSpots.map(([x, y]) => Math.hypot(x - rx, y - ry)));
      Sound.water(Math.max(0, 1 - dmin / 6));
    }
    if ((L.t * 4 | 0) !== L._tick) { L._tick = L.t * 4 | 0; renderStats(); }
  }

  function updateLife(dt, rx, ry) {
    // কবুতর
    let scared = false;
    for (const b of L.pigeons) {
      b.t += dt;
      const dx = b.x - (rx * T + T / 2), dy = b.y - (ry * T + T * 0.8);
      const dist = Math.hypot(dx, dy);
      if (b.state === 'peck') {
        if (dist < T * 1.9) {
          b.state = 'fly'; scared = true;
          const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.8;
          b.vx = Math.cos(a) * (110 + Math.random() * 60); b.vy = Math.sin(a) * (70 + Math.random() * 40); b.vz = 90 + Math.random() * 40;
          b.dir = b.vx > 0 ? 1 : -1; b.flyT = 0;
        } else if (Math.random() < dt * 0.6) {
          b.x += (Math.random() - 0.5) * 8; b.y += (Math.random() - 0.5) * 5; b.dir = Math.random() < 0.5 ? 1 : -1;
        }
      } else {
        b.flyT += dt;
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.flyT < 1.4) b.z += b.vz * dt;
        else {
          // ফিরে এসে নামে
          const hx = (b.home.x + Math.random() * b.home.w) * T, hy = (b.home.y + Math.random() * b.home.h) * T;
          if (!b.target) b.target = [hx, hy];
          const tx = b.target[0] - b.x, ty = b.target[1] - b.y, tl = Math.hypot(tx, ty) || 1;
          const pd = Math.hypot(b.target[0] - (rx * T + T / 2), b.target[1] - (ry * T + T * 0.8));
          if (pd < T * 2.5) { b.target = null; b.vx = (Math.random() - 0.5) * 160; b.vy = (Math.random() - 0.5) * 100; b.flyT = 0.6; continue; }
          b.vx += (tx / tl * 120 - b.vx) * dt * 2; b.vy += (ty / tl * 120 - b.vy) * dt * 2;
          b.dir = b.vx > 0 ? 1 : -1;
          b.z = Math.max(0, b.z - 50 * dt);
          if (tl < 10 && b.z < 2) { b.state = 'peck'; b.z = 0; b.target = null; }
        }
      }
    }
    if (scared) Sound.sfx('flap');
    // প্রজাপতি
    for (const f of L.butterflies) {
      const s = L.t * 0.7 + f.seed;
      f.x = f.cx + Math.sin(s * 1.3) * f.r + Math.sin(s * 3.1) * 8;
      f.y = f.cy + Math.cos(s * 0.9) * f.r * 0.5 - 14 + Math.sin(s * 5) * 4;
    }
    // মেঘের ছায়া
    for (const c of L.clouds) { c.x += c.v * dt; if (c.x > L.C * T + 200) { c.x = -cloudImg.width * c.s; c.y = Math.random() * L.R * T; } }
    // ঝরা পাতা
    if (Math.random() < dt * 0.9) {
      const trees = L.objects.filter((o) => o.kind === 'tree' && Math.abs(o.x - rx) < 9 && Math.abs(o.y - ry) < 7);
      if (trees.length) {
        const tr = trees[(Math.random() * trees.length) | 0];
        L.particles.push({ kind: 'leaf', x: tr.x * T + T / 2 + (Math.random() - 0.5) * 30, y: tr.y * T - T * 0.7, vy: 22 + Math.random() * 12, life: 2.4, rot: Math.random() * 6, seed: Math.random() * 9, color: Math.random() < 0.6 ? '#7fae4a' : '#d9b44a' });
      }
    }
  }

  function arrive() {
    const p = L.player;
    const surf = L.at(p.x, p.y);
    Sound.sfx('step', surf === 'p' || surf === 'G' ? 'p' : 'g');
    if (surf === 'p' || surf === 'G') puff(p.x * T + T / 2, (p.y + 1) * T - 6);
    const coin = L.objects.find((o) => o.kind === 'coin' && !o.hidden && o.x === p.x && o.y === p.y);
    if (coin) {
      coin.hidden = true;
      L.coins++;
      sparkle(p.x, p.y, 16);
      floatText(p.x, p.y, `+১ ${L.def.coinName || 'মুঘল মুদ্রা'}`);
      Sound.sfx('coin');
      renderStats();
      toast(`🪙 একটা <b>${L.def.coinName || 'পুরনো মুঘল মুদ্রা'}</b> পেয়েছ! (${bn(L.coins)}/${bn(L.coinTotal)})`);
    }
  }

  function playerPos() {
    const p = L.player;
    if (!p.to) return [p.x, p.y];
    const e = p.k;
    return [p.from[0] + (p.to[0] - p.from[0]) * e, p.from[1] + (p.to[1] - p.from[1]) * e];
  }

  function updateFog(px, py) {
    const { C, R } = L;
    const sight = SIGHT + (L.flags.sightBonus || 0);
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
      if (Math.hypot(x - px, y - py) < sight - 0.6) L.explored[y * C + x] = 1;
    }
    const d = L.fogImg.data, FW = C * FOGRES;
    for (let fy = 0; fy < R * FOGRES; fy++) for (let fx = 0; fx < FW; fx++) {
      const wx = (fx + 0.5) / FOGRES - 0.5, wy = (fy + 0.5) / FOGRES - 0.5;
      const dist = Math.hypot(wx - px, wy - py);
      const vis = Math.max(0, Math.min(1, (sight - dist) / 1.6));
      const ex = L.explored[((fy / FOGRES) | 0) * C + ((fx / FOGRES) | 0)];
      const a = (1 - vis) * (ex ? 0.42 : 0.84);
      const i = (fy * FW + fx) * 4;
      d[i] = 9; d[i + 1] = 20; d[i + 2] = 17; d[i + 3] = a * 255;
    }
    L.fogCtx.putImageData(L.fogImg, 0, 0);
  }

  // ---------- আঁকা ----------
  function toScreen(wx, wy) {
    return [(wx - L.cam.x) * scale + W / 2, (wy - L.cam.y) * scale + H / 2];
  }
  function toWorld(sx, sy) {
    return [(sx - W / 2) / scale + L.cam.x, (sy - H / 2) / scale + L.cam.y];
  }
  function clampCam() {
    const vw = W / scale, vh = H / scale, ww = L.C * T, wh = L.R * T;
    L.cam.x = ww > vw ? Math.max(vw / 2, Math.min(ww - vw / 2, L.cam.x)) : ww / 2;
    L.cam.y = wh > vh ? Math.max(vh / 2 - 60 / scale, Math.min(wh - vh / 2 + (L.dialog ? 170 : touch ? 200 : 50) / scale, L.cam.y)) : wh / 2;
  }

  function hovered() {
    if (!mouse || touch || L.busy || L.mode !== 'play') return null;
    const [wx, wy] = toWorld(mouse.sx, mouse.sy);
    const tx = Math.floor(wx / T), ty = Math.floor(wy / T);
    const o = objectAt(tx, ty);
    return { tx, ty, o: o && o.interact ? o : null };
  }

  function draw() {
    clampCam();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#09140f';
    ctx.fillRect(0, 0, W, H);
    const s = dpr * scale;
    const sh = L.shake ? (Math.random() - 0.5) * 6 * L.shake * 4 : 0;
    ctx.setTransform(s, 0, 0, s, dpr * (W / 2 - L.cam.x * scale + sh), dpr * (H / 2 - L.cam.y * scale));
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(L.ground, 0, 0);

    const x0 = Math.max(0, Math.floor((L.cam.x - W / 2 / scale) / T) - 1), x1 = Math.min(L.C, Math.ceil((L.cam.x + W / 2 / scale) / T) + 1);
    const y0 = Math.max(0, Math.floor((L.cam.y - H / 2 / scale) / T) - 1), y1 = Math.min(L.R, Math.ceil((L.cam.y + H / 2 / scale) / T) + 3);

    // পানির ঝিকিমিকি
    ctx.strokeStyle = 'rgba(200,240,235,0.35)'; ctx.lineWidth = 1.5;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const t = L.at(x, y);
      if (t !== 'w' && t !== 'c' && t !== 'k') continue;
      const ph = L.t * 1.6 + x * 0.9 + y * 1.7;
      ctx.globalAlpha = 0.4 + Math.sin(ph) * 0.3;
      const ox = x * T + 12 + Math.sin(ph) * 5, oy = y * T + 16 + ((x * 13 + y * 7) % 18);
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.quadraticCurveTo(ox + 5, oy - 3, ox + 10, oy); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // গর্ত
    for (const h of L.holes) {
      const cx = h.x * T + T / 2, cy = h.y * T + T * 0.62;
      ctx.fillStyle = '#7a5232'; ctx.beginPath(); ctx.ellipse(cx + 8, cy + 6, 9, 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#2b1a0e'; ctx.beginPath(); ctx.ellipse(cx, cy, 13, 8, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#1a0f07'; ctx.beginPath(); ctx.ellipse(cx, cy + 1.5, 9, 5, 0, 0, 7); ctx.fill();
      if (h.dir) holeArrow(ctx, cx, cy - 2, h.dir, 1);
    }

    // লাল কালির বৃত্ত
    if (L.circle) {
      const c = L.circle, pr = Math.min(1, c.t / 1.4);
      ctx.save();
      ctx.strokeStyle = 'rgba(168,40,22,0.85)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.setLineDash([14, 9]);
      ctx.lineDashOffset = -L.t * 12;
      ctx.beginPath(); ctx.arc(c.x * T + T / 2, c.y * T + T / 2, c.r * T, -Math.PI / 2, -Math.PI / 2 + pr * Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // মাউসের নিচের ঘর
    const hv = hovered();
    if (hv && !hv.o && walkable(hv.tx, hv.ty) && L.explored[idx(hv.tx, hv.ty)]) {
      ctx.strokeStyle = 'rgba(255,240,190,0.45)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      Art.rrect(ctx, hv.tx * T + 4, hv.ty * T + 4, T - 8, T - 8, 6); ctx.stroke(); ctx.setLineDash([]);
    }
    canvas.style.cursor = hv && hv.o ? 'pointer' : 'default';

    // গন্তব্য চিহ্ন
    if (L.marker) {
      const m = L.marker, a = 1 - ((m.t * 1.5) % 1);
      ctx.strokeStyle = `rgba(255,240,190,${0.4 + a * 0.5})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(m.x * T + T / 2, m.y * T + T * 0.6, 8 + (1 - a) * 8, 4 + (1 - a) * 4, 0, 0, 7); ctx.stroke();
    }

    // গভীরতা অনুযায়ী সাজানো জিনিস
    const list = [];
    for (const o of L.objects) {
      if (o.hidden) continue;
      if (o.x + o.w < x0 - 3 || o.x > x1 + 3 || o.y > y1 + 1 || o.y + o.h < y0 - 3) continue;
      list.push({ y: (o.y + o.h) * T - (o.kind === 'coin' ? 20 : 0) - (o.flat ? T : 0), o });
    }
    for (const b of L.pigeons) if (b.z < 4) list.push({ y: b.y, pigeon: b });
    const [prx, pry] = playerPos();
    list.push({ y: (pry + 1) * T - 1, player: true });
    list.sort((a, b) => a.y - b.y);
    const glow = hv && hv.o;
    for (const it of list) {
      if (it.player) drawPlayer(prx, pry);
      else if (it.pigeon) Art.pigeon(ctx, it.pigeon, L.t);
      else {
        if (glow === it.o) { ctx.save(); ctx.shadowColor = 'rgba(255,214,110,0.95)'; ctx.shadowBlur = 18; drawObject(it.o); ctx.restore(); }
        else drawObject(it.o);
      }
    }
    for (const b of L.pigeons) if (b.z >= 4) Art.pigeon(ctx, b, L.t);
    for (const f of L.butterflies) Art.butterfly(ctx, f, L.t);

    if (L.def.drawWorld) L.def.drawWorld(ctx, api, T);
    if (L.chest) drawChest();

    // মেঘের ছায়া
    for (const c of L.clouds) { ctx.globalAlpha = 0.22; ctx.drawImage(cloudImg, c.x, c.y, cloudImg.width * c.s, cloudImg.height * c.s); }
    ctx.globalAlpha = 1;

    // কুয়াশা
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(L.fog, 0, 0, L.C * FOGRES, L.R * FOGRES, 0, 0, L.C * T, L.R * T);

    // কুয়াশার উপরে: সংকেত, লেখা, কণা
    for (const o of L.objects) {
      if (o.hidden || !o.bubble || !o.bubble(api)) continue;
      if (!L.explored[o.y * L.C + Math.min(L.C - 1, o.x + ((o.w / 2) | 0))]) continue;
      const cx = (o.x + o.w / 2) * T, cy = o.y * T - (o.kind === 'building' ? T * 1.2 : 44) + Math.sin(L.t * 4) * 3;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(cx + 2, cy + 2, 11, 0, 7); ctx.fill();
      ctx.fillStyle = o.optional ? '#8fd0ff' : '#f2c14e'; ctx.beginPath(); ctx.arc(cx, cy, 11, 0, 7); ctx.fill();
      ctx.strokeStyle = o.optional ? '#235a85' : '#7a4a08'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = o.optional ? '#123a5a' : '#4a2a05'; ctx.font = 'bold 15px Hind Siliguri, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(o.optional ? '?' : '!', cx, cy + 1);
    }

    const near = !L.busy && L.mode === 'play' ? nearbyInteractable() : null;
    if (near && near.prompt) {
      const px = prx * T + T / 2, py = pry * T - 58;
      const label = `${near.prompt}  ·  ${touch ? 'ট্যাপ করো' : 'Space'}`;
      ctx.font = '600 13px Hind Siliguri, sans-serif';
      const w = ctx.measureText(label).width + 22;
      ctx.fillStyle = 'rgba(25,14,5,0.88)'; Art.rrect(ctx, px - w / 2, py - 13, w, 26, 13); ctx.fill();
      ctx.strokeStyle = 'rgba(242,193,78,0.6)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#f6e7c1'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, px, py + 1);
    }
    L.near = near;
    $('lv-act').classList.toggle('show', !!near && touch);

    for (const pt of L.particles) {
      if (pt.kind === 'text') {
        ctx.globalAlpha = Math.min(1, pt.life);
        ctx.font = '700 15px Hind Siliguri, sans-serif'; ctx.textAlign = 'center';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(30,15,5,0.85)'; ctx.strokeText(pt.text, pt.x, pt.y);
        ctx.fillStyle = pt.color; ctx.fillText(pt.text, pt.x, pt.y);
      } else if (pt.kind === 'puff') {
        ctx.globalAlpha = Math.max(0, pt.life * 2); ctx.fillStyle = pt.color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, 7); ctx.fill();
      } else if (pt.kind === 'leaf') {
        ctx.globalAlpha = Math.min(1, pt.life); ctx.fillStyle = pt.color;
        ctx.save(); ctx.translate(pt.x, pt.y); ctx.rotate(pt.rot); ctx.beginPath(); ctx.ellipse(0, 0, 4, 2, 0, 0, 7); ctx.fill(); ctx.restore();
      } else {
        ctx.globalAlpha = Math.max(0, Math.min(1, pt.life * 2));
        ctx.fillStyle = pt.color; ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
      }
    }
    ctx.globalAlpha = 1;

    // আলো ও ভিনিয়েট
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sun = ctx.createRadialGradient(W * 0.1, -H * 0.1, 0, W * 0.1, -H * 0.1, Math.max(W, H) * 0.9);
    sun.addColorStop(0, 'rgba(255,215,140,0.16)'); sun.addColorStop(1, 'rgba(255,215,140,0)');
    ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H);
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(5,10,8,0.55)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }

  function drawPlayer(x, y) {
    const p = L.player;
    // ঝোপে লুকালে খেলোয়াড় আধা-স্বচ্ছ
    const hid = L.def.hideTiles && L.def.hideTiles.includes(L.at(p.x, p.y));
    if (hid) ctx.globalAlpha = 0.5;
    Art.explorer(ctx, x * T + T / 2, (y + 1) * T - 6, L.t * (p.stepDur === RUN && p.to ? 1.5 : 1), p.dir, !!p.to, p.digT);
    ctx.globalAlpha = 1;
  }

  function drawObject(o) {
    const px = o.x * T, py = o.y * T;
    if (o.draw) { o.draw(ctx, L.t, T, o); return; }
    if (o.kind === 'building') ctx.drawImage(o.sprite.img, px + o.sprite.ox, py + o.sprite.oy);
    else if (o.kind === 'door') Art.alleyGate(ctx, px, py, o.open, o.lockColor || '#c9a463', L.t);
    else if (o.kind === 'tree' || o.kind === 'stele') ctx.drawImage(o.sprite.img, px + T / 2 - o.sprite.ax, py + T - o.sprite.ay + 4);
    else if (o.kind === 'gate') ctx.drawImage(o.sprite.img, px, py + T - o.sprite.ay + 6);
    else if (o.kind === 'npc') {
      if (o.look) Art.person(ctx, px + T / 2, py + T - 6, L.t, o.look);
      else if (o.style === 'kid') {
        const throwing = Math.sin(L.t * 1.3) > 0.8;
        if (throwing && Math.random() < 0.3) L.particles.push({ kind: 'spark', x: px + T / 2 + 10, y: py + T - 30, vx: 20 + Math.random() * 40, vy: -30, life: 0.6, color: '#e6d3a3', size: 2, grav: 200 });
        Art.kid(ctx, px + T / 2, py + T - 6, L.t, throwing);
      } else Art.caretaker(ctx, px + T / 2, py + T - 6, L.t);
    }
    else if (o.kind === 'fountain') drawFountain(px + T / 2, py + T / 2);
    else if (o.kind === 'coin') {
      if (!L.explored[o.y * L.C + o.x]) return;
      const b = Math.sin(L.t * 3 + o.x) * 3, cx = px + T / 2, cy = py + T / 2 - 4 + b;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(cx, py + T * 0.75, 8, 3, 0, 0, 7); ctx.fill();
      const sq = Math.abs(Math.cos(L.t * 2.2 + o.x));
      ctx.fillStyle = '#b8740f'; ctx.beginPath(); ctx.ellipse(cx, cy, 9 * sq + 1.5, 9, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#f2c14e'; ctx.beginPath(); ctx.ellipse(cx, cy, 7 * sq + 1, 7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(cx - 2 * sq, cy - 3, 1.8, 0, 7); ctx.fill();
      if (Math.sin(L.t * 5 + o.y) > 0.92) { ctx.fillStyle = '#fff'; ctx.fillRect(cx + 6, cy - 10, 2, 6); ctx.fillRect(cx + 4, cy - 8, 6, 2); }
    }
  }

  function drawFountain(cx, cy) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(cx + 3, cy + 5, 18, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#d8c6a0'; ctx.beginPath(); ctx.ellipse(cx, cy, 18, 10, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a8c97'; ctx.beginPath(); ctx.ellipse(cx, cy, 13, 7, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#bfae88'; ctx.fillRect(cx - 2.5, cy - 16, 5, 16);
    for (let i = 0; i < 8; i++) {
      const ph = (L.t * 1.3 + i / 8) % 1, a = (i / 8) * Math.PI * 2;
      const dx = Math.cos(a) * 11 * ph, dy = -18 + ph * 22 - Math.sin(ph * Math.PI) * 10 + Math.sin(a) * 3 * ph;
      ctx.fillStyle = `rgba(210,240,245,${1 - ph})`;
      ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 1.8, 0, 7); ctx.fill();
    }
  }

  function drawChest() {
    const c = L.chest, k = Math.min(1, c.t / 1.2);
    const cx = c.x * T + T / 2, base = c.y * T + T * 0.7;
    const rise = (1 - Math.pow(1 - k, 3)) * 26;
    const open = Math.max(0, Math.min(1, (c.t - 1.1) / 0.5));
    if (open > 0) {
      ctx.save(); ctx.globalAlpha = open * 0.8; ctx.translate(cx, base - rise - 10);
      for (let i = 0; i < 10; i++) {
        ctx.rotate(Math.PI / 5 + L.t * 0.05);
        const g = ctx.createLinearGradient(0, 0, 0, -90);
        g.addColorStop(0, 'rgba(255,230,150,0.7)'); g.addColorStop(1, 'rgba(255,230,150,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.lineTo(14, -90); ctx.lineTo(-14, -90); ctx.fill();
      }
      ctx.restore();
    }
    const y = base - rise;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(cx, base + 4, 20, 6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7a4318'; Art.rrect(ctx, cx - 18, y - 18, 36, 20, 3); ctx.fill();
    ctx.fillStyle = '#e0a12c'; ctx.fillRect(cx - 18, y - 12, 36, 3); ctx.fillRect(cx - 3, y - 15, 6, 8);
    if (open > 0) {
      ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.ellipse(cx, y - 18, 16, 4, 0, 0, 7); ctx.fill();
      const gy = y - 24 - open * 22;
      ctx.save(); ctx.translate(cx, gy); ctx.scale(1.2, 1.2);
      ctx.shadowColor = '#f2c14e'; ctx.shadowBlur = 18;
      const g = ctx.createLinearGradient(-8, -12, 8, 8);
      g.addColorStop(0, '#fff4c2'); g.addColorStop(0.5, '#f2c14e'); g.addColorStop(1, '#b8740f');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(-5, -10); ctx.lineTo(5, -10); ctx.lineTo(9, -4); ctx.lineTo(0, 9); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.save(); ctx.translate(cx, y - 18); ctx.rotate(-open * 1.1);
    ctx.fillStyle = '#9a5a22'; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.quadraticCurveTo(0, -16, 18, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e0a12c'; ctx.fillRect(-18, -2, 36, 3);
    ctx.restore();
  }

  // ---------- লুপ ----------
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (L) { update(dt); draw(); drawMinimap(); }
    raf = requestAnimationFrame(frame);
  }

  // ---------- ইনপুট ----------
  function action() {
    if (!L) return;
    if (L.dialog) { advanceDialog(); return; }
    const n = nearbyInteractable();
    if (n) interact(n); else dig();
  }

  function onKey(e) {
    if (e.key === 'Shift') shift = e.type === 'keydown';
    if (!L || !root.classList.contains('show')) return;
    if ($('lv-modal').classList.contains('show') || document.getElementById('settings').classList.contains('show')) return;
    const d = KEYMAP[e.code];
    if (mini.open && e.type === 'keydown' && e.code !== 'KeyN' && e.code !== 'Tab' && e.code !== 'Escape') return;
    if (e.type === 'keydown') {
      if (L.dialog && L.dialog.choicesShown) {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= L.dialog.lines[L.dialog.i].choices.length) { e.preventDefault(); pickChoice(n - 1); }
        return;
      }
      if (d) { e.preventDefault(); if (!held.includes(d)) held.push(d); return; }
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') {
        e.preventDefault();
        if (e.repeat) return;
        action();
      }
      if (e.code === 'KeyF') dig();
      if (e.code === 'KeyN' || e.code === 'Tab') { e.preventDefault(); if (mini.open) closeMap(); else openMap(); }
      if (e.code === 'Escape' && mini.open) closeMap();
    } else if (d) held = held.filter((k) => k !== d);
  }

  function onPointer(e) {
    if (!L || L.mode !== 'play') return;
    if (L.dialog) { if (!L.dialog.choicesShown) advanceDialog(); return; }
    if (L.busy) return;
    const r = canvas.getBoundingClientRect();
    const [wx, wy] = toWorld(e.clientX - r.left, e.clientY - r.top);
    const tx = Math.floor(wx / T), ty = Math.floor(wy / T);
    const o = objectAt(tx, ty);
    if (o && o.interact) { goTo(tx, ty, o); return; }
    if (L.player.x === tx && L.player.y === ty && !L.player.to) { const n = nearbyInteractable(); if (n) interact(n); return; }
    goTo(tx, ty);
  }

  // ---------- UI ----------
  function renderStats() {
    if (!L) return;
    $('lv-digs').textContent = has('shovel') ? `${bn(L.digs)}/${bn(L.digsMax)}` : '—';
    $('lv-coins').textContent = `${bn(L.coins)}/${bn(L.coinTotal)}`;
    const s = L.time | 0;
    $('lv-time').textContent = `${bn((s / 60) | 0)}:${bn(String(s % 60).padStart(2, '0'))}`;
    $('lv-dig').disabled = !has('shovel');
  }

  function renderObjectives() {
    const list = L.def.objectives;
    const firstOpen = list.find((o) => !o.optional && !L.done.has(o.id));
    $('lv-obj-list').innerHTML = list.map((o) =>
      `<li class="${L.done.has(o.id) ? 'done' : o === firstOpen ? 'current' : ''} ${o.optional ? 'optional' : ''}"><span class="tick">${L.done.has(o.id) ? '✓' : o.optional ? '★' : ''}</span>${o.text}</li>`).join('');
    $('lv-clue').innerHTML = L.clues.map((c) => `<div class="clue">📜 ${c}</div>`).join('');
  }

  function renderInventory(newId) {
    const slots = [];
    for (let i = 0; i < Math.max(4, L.items.length); i++) {
      const it = L.items[i];
      slots.push(`<div class="slot ${it ? 'full' : ''} ${it && it.id === newId ? 'new' : ''} ${it && it.view ? 'viewable' : ''}" data-i="${i}" title="${it ? it.name + (it.view ? ' (দেখতে ক্লিক করো)' : '') : 'খালি'}">${it ? it.icon : ''}</div>`);
    }
    $('lv-inventory').innerHTML = slots.join('');
  }

  function updateCompass() {
    const el = $('lv-compass');
    if (!has('compass')) {
      if (el.className !== 'off') { el.className = 'off'; $('lv-heat').textContent = 'কম্পাস নেই'; el.querySelector('.needle').style.transform = ''; }
      return;
    }
    if (!compassAwake()) {
      const n = cluesLeft();
      const txt = `ঘুমন্ত · আর ${bn(n)}টি কাজ`;
      if (el.className !== 'sleep' || $('lv-heat').textContent !== txt) {
        el.className = 'sleep'; $('lv-heat').textContent = txt; el.querySelector('.needle').style.transform = '';
      }
      L._awake = false;
      return;
    }
    if (L._awake === false) { toast('🧭 সব সূত্র মিলেছে! কম্পাস এবার <b>জেগে উঠেছে</b>। গুপ্তধনের কাছে গেলে গরম হবে।'); Sound.sfx('star'); }
    L._awake = true;
    const h = heat();
    if (L._heat !== undefined && h.lv > L._heat && h.lv >= 3) Sound.sfx('tick');
    L._heat = h.lv;
    el.className = `heat-${h.lv}`;
    $('lv-heat').textContent = h.text;
    const wob = [6, 10, 20, 40, 75][h.lv];
    const ang = Math.sin(L.t * (2 + h.lv * 3)) * wob;
    el.querySelector('.needle').style.transform = `rotate(${ang}deg)`;
  }

  const SPEAKERS = {
    chowkidar: { name: 'চৌকিদার রহিম মিয়া', face: '👳🏽‍♂️' },
    mithu: { name: 'মিঠু', face: '👦🏽' },
    narrator: { name: '', face: '📜' },
    player: { name: 'তুমি', face: '🧭' },
  };
  function renderDialog() {
    const line = L.dialog.lines[L.dialog.i];
    const sp = (L.def.speakers && L.def.speakers[line.who]) || SPEAKERS[line.who] || SPEAKERS.narrator;
    $('lv-dlg-face').textContent = sp.face;
    $('lv-dlg-name').textContent = sp.name;
    $('lv-dlg-name').style.display = sp.name ? '' : 'none';
    $('lv-dialog').classList.toggle('narration', !sp.name);
    $('lv-dlg-choices').innerHTML = '';
    L.dialog.choicesShown = false;
    L.dialog.shown = 0;
    Sound.voice.line(line.text, line.who);
    renderDialogText();
  }
  function renderDialogText() {
    const d = L.dialog, line = d.lines[d.i];
    $('lv-dlg-text').innerHTML = line.text.slice(0, Math.floor(d.shown)).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*\*[^*]*$/, '').replace(/\*$/, '');
    const full = d.shown >= line.text.length;
    if (full && line.choices && !d.choicesShown) {
      d.choicesShown = true;
      $('lv-dlg-choices').innerHTML = line.choices.map((c, i) => `<button class="dlg-choice" data-i="${i}"><span>${bn(i + 1)}</span>${c}</button>`).join('');
    }
    $('lv-dlg-more').style.visibility = full && !line.choices ? 'visible' : 'hidden';
  }
  function pickChoice(i) {
    Sound.sfx('click');
    L.dialog.choice = i;
    L.dialog.shown = Infinity;
    nextLine();
  }
  function advanceDialog() {
    const d = L.dialog;
    if (!d) return;
    const line = d.lines[d.i];
    if (d.shown < line.text.length) { d.shown = line.text.length; renderDialogText(); return; }
    if (line.choices) return; // উত্তর বেছে নিতে হবে
    nextLine();
  }
  function nextLine() {
    const d = L.dialog;
    d.i++;
    if (d.i >= d.lines.length) {
      L.dialog = null;
      Sound.voice.stop();
      $('lv-dialog').classList.remove('show');
      L.busy = false;
      d.res(d.choice);
      return;
    }
    renderDialog();
  }

  // ---------- মোডাল ----------
  let modalHandler = null;
  function openModal(html, onAct) {
    $('lv-modal-card').innerHTML = html;
    $('lv-modal').classList.add('show');
    modalHandler = onAct;
    held = [];
  }
  function closeModal() { $('lv-modal').classList.remove('show'); modalHandler = null; }

  function openQuiz(q) {
    return new Promise((res) => {
      const opts = q.options.map((o, i) => `<button class="quiz-opt" data-act="opt" data-i="${i}"><span>${'কখগঘ'[i]}</span>${o}</button>`).join('');
      openModal(`
        <div class="lv-modal-icon">📖</div>
        <div class="lv-modal-kicker">${q.kicker || 'পুরনো পুঁথির ধাঁধা'}</div>
        <h3>${q.question}</h3>
        <div class="quiz-opts">${opts}</div>
        <div class="lv-modal-actions"><button class="btn-ghost" data-act="close">পরে চেষ্টা করব</button></div>`,
      (act, el) => {
        if (act === 'close') { closeModal(); res(false); return; }
        const i = +el.dataset.i;
        if (i === q.answer) {
          el.classList.add('right'); Sound.sfx('right');
          setTimeout(() => { closeModal(); res(true); }, 800);
        } else {
          el.classList.add('wrong'); Sound.sfx('wrong');
          el.disabled = true;
          shakeCard();
        }
      });
    });
  }
  function shakeCard() { const c = $('lv-modal-card'); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); }

  function openLock(o) {
    return new Promise((res) => {
      const digits = Array(o.code.length).fill(0);
      const dials = digits.map((d, i) => `
        <div class="dial">
          <button data-act="up" data-i="${i}" aria-label="বাড়াও">▲</button>
          <div class="dial-num" id="dial-${i}">${bn(d)}</div>
          <button data-act="down" data-i="${i}" aria-label="কমাও">▼</button>
        </div>`).join('');
      openModal(`
        <div class="lv-modal-icon">🔐</div>
        <div class="lv-modal-kicker">${o.kicker || 'লোহার সিন্দুক'}</div>
        <h3>${o.title || 'চার অঙ্কের তালা'}</h3>
        <p class="lock-hint">${o.hint}</p>
        <div class="dials">${dials}</div>
        <div id="lock-msg"></div>
        <div class="lv-modal-actions">
          <button class="btn-primary" data-act="try">${o.tryLabel || 'তালা খোলো'}</button>
          <button class="btn-ghost" data-act="close">ফিরে যাও</button>
        </div>`,
      (act, el) => {
        if (act === 'up' || act === 'down') {
          const i = +el.dataset.i;
          digits[i] = (digits[i] + (act === 'up' ? 1 : 9)) % 10;
          $(`dial-${i}`).textContent = bn(digits[i]);
          $(`dial-${i}`).classList.remove('tick'); void $(`dial-${i}`).offsetWidth; $(`dial-${i}`).classList.add('tick');
          Sound.sfx('tick');
        } else if (act === 'try') {
          if (digits.join('') === o.code) {
            $('lock-msg').innerHTML = `<span class="ok">${o.okMsg || 'ক্লিক! তালা খুলে গেল।'}</span>`;
            Sound.sfx('unlock');
            setTimeout(() => { closeModal(); res(true); }, 900);
          } else {
            $('lock-msg').innerHTML = `<span class="bad">${o.wrongMsg || 'খুলল না… খোদাই করা লেখাটা আবার ভাবো।'}</span>`;
            Sound.sfx('wrong');
            shakeCard();
          }
        } else if (act === 'close') { closeModal(); res(false); }
      });
    });
  }

  // টালি ঘোরানোর ধাঁধা: ৩×৩ টালি ঘুরিয়ে নকশা মেলাও
  function openTiles(o) {
    return new Promise((res) => {
      const N = 3, size = 270;
      const img = Art[o.image || 'medallion'](size).toDataURL();
      const rot = [];
      for (let i = 0; i < N * N; i++) rot.push(i === 4 ? 0 : 1 + ((Math.random() * 3) | 0));
      const tiles = rot.map((r, i) => {
        const x = (i % N) * 50, y = ((i / N) | 0) * 50;
        return `<button class="tile ${i === 4 ? 'fixed' : ''}" data-act="rot" data-i="${i}" style="background-image:url(${img});background-position:${x}% ${y}%;transform:rotate(${r * 90}deg)"></button>`;
      }).join('');
      openModal(`
        <div class="lv-modal-kicker">${o.kicker || 'মাজারের মেঝে'}</div>
        <h3>${o.title || 'টালির নকশা মেলাও'}</h3>
        <p class="lock-hint">${o.hint || 'টালিতে ক্লিক করলে সেটা ঘুরবে। পুরো ফুলের নকশাটা মিলিয়ে দাও।'}</p>
        <div class="tiles" id="tiles">${tiles}</div>
        <div id="lock-msg"></div>
        <div class="lv-modal-actions"><button class="btn-ghost" data-act="close">পরে করব</button></div>`,
      (act, el) => {
        if (act === 'close') { closeModal(); res(false); return; }
        if (act !== 'rot' || el.classList.contains('fixed') || $('tiles').classList.contains('solved')) return;
        const i = +el.dataset.i;
        rot[i]++;
        el.style.transform = `rotate(${rot[i] * 90}deg)`;
        Sound.sfx('rotate');
        if (rot.every((r) => r % 4 === 0)) {
          $('tiles').classList.add('solved');
          $('lock-msg').innerHTML = '<span class="ok">অসাধারণ! নকশা মিলে গেছে।</span>';
          Sound.sfx('right');
          setTimeout(() => { closeModal(); res(true); }, 1400);
        }
      });
    });
  }

  // ঘণ্টার সুর মেলানো (শুনে একই ক্রমে বাজাও)
  function openBells(o) {
    return new Promise((res) => {
      const NAMES = ['সা', 'রে', 'গা', 'পা'];
      const rounds = o.rounds || [3, 4, 5];
      const seq = [];
      for (let i = 0; i < rounds[rounds.length - 1]; i++) {
        let n; do { n = (Math.random() * 4) | 0; } while (i > 0 && n === seq[i - 1] && Math.random() < 0.6);
        seq.push(n);
      }
      let round = 0, pos = 0, playing = false, done = false;
      const bells = NAMES.map((n, i) => `<button class="bell b${i}" data-act="bell" data-i="${i}"><span class="bell-body"></span><b>${n}</b></button>`).join('');
      openModal(`
        <div class="lv-modal-kicker">${o.kicker || 'নাচঘরের ঘণ্টা'}</div>
        <h3>${o.title || 'সুর শুনে একই ক্রমে বাজাও'}</h3>
        <p class="lock-hint">${o.hint || ''}</p>
        <div class="bells">${bells}</div>
        <div class="bell-progress" id="bell-prog"></div>
        <div id="lock-msg"></div>
        <div class="lv-modal-actions">
          <button class="btn-primary" data-act="listen">🔔 আবার শোনো</button>
          <button class="btn-ghost" data-act="close">পরে করব</button>
        </div>`,
      (act, el) => {
        if (act === 'close') { done = true; closeModal(); res(false); return; }
        if (act === 'listen') { if (!playing) play(); return; }
        if (act !== 'bell' || playing || done) return;
        const i = +el.dataset.i;
        ring(i);
        if (i !== seq[pos]) {
          Sound.sfx('wrong'); shakeCard();
          $('lock-msg').innerHTML = '<span class="bad">সুর মেলেনি… আবার শোনো।</span>';
          pos = 0;
          setTimeout(play, 1100);
          return;
        }
        pos++;
        progress();
        if (pos >= rounds[round]) {
          round++; pos = 0;
          if (round >= rounds.length) {
            done = true;
            $('lock-msg').innerHTML = '<span class="ok">অপূর্ব! পুরো সুর মিলে গেছে।</span>';
            setTimeout(() => Sound.sfx('right'), 400);
            setTimeout(() => { closeModal(); res(true); }, 1600);
          } else {
            $('lock-msg').innerHTML = `<span class="ok">ঠিক! এবার আরও লম্বা সুর…</span>`;
            setTimeout(play, 1000);
          }
        }
      });
      function ring(i) {
        Sound.sfx('bell', i);
        const b = document.querySelector(`.bell.b${i}`);
        if (!b) return;
        b.classList.remove('lit'); void b.offsetWidth; b.classList.add('lit');
        setTimeout(() => b.classList.remove('lit'), 420);
      }
      function progress() {
        const n = rounds[round] || 0;
        $('bell-prog').innerHTML = `<span>ধাপ ${bn(Math.min(round + 1, rounds.length))}/${bn(rounds.length)}</span>` +
          Array.from({ length: n }, (_, k) => `<i class="${k < pos ? 'on' : ''}"></i>`).join('');
      }
      function play() {
        if (done) return;
        playing = true; pos = 0; progress();
        $('lock-msg').innerHTML = '<span>শোনো…</span>';
        const n = rounds[round];
        for (let k = 0; k < n; k++) setTimeout(() => { if (!done) ring(seq[k]); }, 300 + k * 620);
        setTimeout(() => { playing = false; if (!done) $('lock-msg').innerHTML = '<span>এবার তুমি বাজাও!</span>'; }, 300 + n * 620);
      }
      setTimeout(play, 600);
    });
  }

  // জিনিস দেখা (তাম্রলিপি, চাবি-লিপি ইত্যাদি)
  function openView(o) {
    return new Promise((res) => {
      Sound.sfx('page');
      openModal(`
        <div class="lv-modal-kicker">${o.kicker || ''}</div>
        <h3>${o.title}</h3>
        <div class="view-body">${o.html}</div>
        <div class="lv-modal-actions"><button class="btn-primary" data-act="close">ঠিক আছে</button></div>`,
      (act) => { if (act === 'close') { closeModal(); res(); } });
    });
  }

  // স্মৃতির খেলা: উল্টানো ফলক থেকে জোড়া খোঁজো
  function openMemory(o) {
    return new Promise((res) => {
      const faces = o.faces.slice(0, o.pairs || 6);
      const deck = faces.concat(faces).map((f, i) => ({ f, i })).sort(() => Math.random() - 0.5);
      let open = [], matched = 0, moves = 0, lock = false, done = false;
      const cards = deck.map((c, k) => `<button class="mem-card" data-act="flip" data-k="${k}"><span class="mem-back"></span><span class="mem-face">${c.f}</span></button>`).join('');
      openModal(`
        <div class="lv-modal-kicker">${o.kicker || ''}</div>
        <h3>${o.title}</h3>
        <p class="lock-hint">${o.hint || ''}</p>
        <div class="mem-grid">${cards}</div>
        <div id="lock-msg"><span>চাল: <b id="mem-moves">০</b></span></div>
        <div class="lv-modal-actions"><button class="btn-ghost" data-act="close">পরে করব</button></div>`,
      (act, el) => {
        if (act === 'close') { done = true; closeModal(); res(false); return; }
        if (act !== 'flip' || lock || done || el.classList.contains('up')) return;
        el.classList.add('up'); Sound.sfx('rotate');
        open.push(el);
        if (open.length < 2) return;
        moves++; $('mem-moves').textContent = bn(moves);
        const [a, b] = open; open = [];
        if (deck[+a.dataset.k].f === deck[+b.dataset.k].f) {
          a.classList.add('matched'); b.classList.add('matched'); Sound.sfx('coin');
          matched++;
          if (matched === faces.length) {
            done = true;
            $('lock-msg').innerHTML = `<span class="ok">সব জোড়া মিলেছে, ${bn(moves)} চালে!</span>`;
            Sound.sfx('right');
            setTimeout(() => { closeModal(); res(true); }, 1500);
          }
        } else {
          lock = true;
          setTimeout(() => { a.classList.remove('up'); b.classList.remove('up'); lock = false; }, 850);
        }
      });
    });
  }

  // ক্রম সাজানোর ধাঁধা (সময়রেখা)
  function openOrder(o) {
    return new Promise((res) => {
      let list = o.items.map((it, i) => ({ ...it, i })).sort(() => Math.random() - 0.5);
      if (list.every((it, k) => it.i === k)) list.reverse();
      const render = () => {
        $('order-list').innerHTML = list.map((it, k) => `
          <div class="order-item">
            <span class="order-n">${bn(k + 1)}</span>
            <div class="order-text"><b>${it.label}</b><small>${it.sub || ''}</small></div>
            <div class="order-btns"><button data-act="up" data-k="${k}" ${k === 0 ? 'disabled' : ''}>▲</button><button data-act="down" data-k="${k}" ${k === list.length - 1 ? 'disabled' : ''}>▼</button></div>
          </div>`).join('');
      };
      openModal(`
        <div class="lv-modal-kicker">${o.kicker || ''}</div>
        <h3>${o.title}</h3>
        <p class="lock-hint">${o.hint || ''}</p>
        <div id="order-list"></div>
        <div id="lock-msg"></div>
        <div class="lv-modal-actions">
          <button class="btn-primary" data-act="check">মিলিয়ে দেখো</button>
          <button class="btn-ghost" data-act="close">পরে করব</button>
        </div>`,
      (act, el) => {
        if (act === 'close') { closeModal(); res(false); return; }
        if (act === 'up' || act === 'down') {
          const k = +el.dataset.k, j = act === 'up' ? k - 1 : k + 1;
          [list[k], list[j]] = [list[j], list[k]];
          Sound.sfx('tick'); render();
        } else if (act === 'check') {
          if (list.every((it, k) => it.i === k)) {
            $('lock-msg').innerHTML = '<span class="ok">একদম ঠিক ক্রম!</span>';
            Sound.sfx('right');
            setTimeout(() => { closeModal(); res(true); }, 1100);
          } else {
            const right = list.filter((it, k) => it.i === k).length;
            $('lock-msg').innerHTML = `<span class="bad">${bn(right)}টা ঠিক জায়গায় আছে। আবার ভাবো।</span>`;
            Sound.sfx('wrong'); shakeCard();
          }
        }
      });
      render();
    });
  }

  // টুকরো সরানোর ধাঁধা (৩×৩, একটা ঘর ফাঁকা)
  function openSlide(o) {
    return new Promise((res) => {
      const N = 3, img = Art[o.image](300).toDataURL();
      let st = [...Array(N * N).keys()]; // st[pos] = টুকরোর নম্বর; ৮ = ফাঁকা
      const blank = () => st.indexOf(N * N - 1);
      const adj = (a, b) => Math.abs((a % N) - (b % N)) + Math.abs(((a / N) | 0) - ((b / N) | 0)) === 1;
      let prev = -1;
      for (let m = 0; m < 80; m++) { // সমাধানযোগ্য এলোমেলো
        const b = blank(); const opts = st.map((_, i) => i).filter((i) => adj(i, b) && i !== prev);
        const c = opts[(Math.random() * opts.length) | 0]; [st[b], st[c]] = [st[c], st[b]]; prev = b;
      }
      if (st.every((v, i) => v === i)) { const b = blank(); const c = st.findIndex((_, i) => adj(i, b)); [st[b], st[c]] = [st[c], st[b]]; }
      let moves = 0, done = false;
      const render = () => {
        $('slide-grid').innerHTML = st.map((v, pos) => v === N * N - 1 && !done ? `<div class="slide-cell blank"></div>`
          : `<button class="slide-cell" data-act="sl" data-p="${pos}" style="background-image:url(${img});background-position:${(v % N) * 50}% ${((v / N) | 0) * 50}%"><i>${bn(v + 1)}</i></button>`).join('');
        $('slide-moves').textContent = bn(moves);
      };
      openModal(`
        <div class="lv-modal-kicker">${o.kicker || ''}</div>
        <h3>${o.title}</h3>
        <p class="lock-hint">${o.hint || ''}</p>
        <div class="slide-grid" id="slide-grid"></div>
        <div id="lock-msg"><span>চাল: <b id="slide-moves">০</b></span></div>
        <div class="lv-modal-actions"><button class="btn-ghost" data-act="close">পরে করব</button></div>`,
      (act, el) => {
        if (act === 'close') { closeModal(); res(false); return; }
        if (act !== 'sl' || done) return;
        const p = +el.dataset.p, b = blank();
        if (!adj(p, b)) { Sound.sfx('tick'); return; }
        [st[b], st[p]] = [st[p], st[b]]; moves++; Sound.sfx('rotate');
        if (st.every((v, i) => v === i)) {
          done = true; render();
          $('slide-grid').classList.add('solved');
          $('lock-msg').innerHTML = `<span class="ok">শিলালিপি জোড়া লেগেছে, ${bn(moves)} চালে!</span>`;
          Sound.sfx('right');
          setTimeout(() => { closeModal(); res(true); }, 1500);
        } else render();
      });
      render();
    });
  }

  function showResult() {
    if (!L) return;
    const used = L.digsMax - L.digs;
    const stars = 1 + (used <= 2 ? 1 : 0) + (L.coins === L.coinTotal ? 1 : 0);
    const s = L.time | 0;
    const starHtml = [0, 1, 2].map((i) => `<span class="star ${i < stars ? 'on' : ''}" style="animation-delay:${0.3 + i * 0.25}s">★</span>`).join('');
    for (let i = 0; i < stars; i++) setTimeout(() => Sound.sfx('star', i), 350 + i * 250);
    const site = L.site;
    L.result = { stars, time: s, digs: used, coins: L.coins };
    const bonus = L.def.objectives.filter((o) => o.optional && L.done.has(o.id)).map((o) => `<div class="bonus-badge">★ ${o.text}</div>`).join('');
    openModal(`
      <div class="result-gem"></div>
      <div class="lv-modal-kicker">রত্নখণ্ড উদ্ধার!</div>
      <h3>${site.name} জয় করেছ!</h3>
      <div class="stars">${starHtml}</div>
      <div class="result-stats">
        <div><b>${bn((s / 60) | 0)}:${bn(String(s % 60).padStart(2, '0'))}</b><span>সময়</span></div>
        <div><b>${bn(used)}</b><span>বার খুঁড়েছ</span></div>
        <div><b>${bn(L.coins)}/${bn(L.coinTotal)}</b><span>${L.def.coinName || 'মুঘল মুদ্রা'}</span></div>
      </div>
      ${bonus}
      <div class="history-card">
        <div class="hc-title">📜 ইতিহাস কার্ড · ${site.era}</div>
        <p>${L.def.historyCard || site.desc}</p>
      </div>
      <p class="star-tip">${stars < 3 ? '⭐ তিন তারা পেতে: ২ বার বা তার কম খুঁড়ে ধন বের করো আর সব মুদ্রা সংগ্রহ করো।' : '🎉 নিখুঁত অভিযান!'}</p>
      <div class="lv-modal-actions">
        <button class="btn-primary" data-act="map">রত্নখণ্ড নিয়ে ম্যাপে ফেরো</button>
        <button class="btn-ghost" data-act="retry">আবার খেলো</button>
      </div>`,
    (act) => {
      if (act === 'map') { closeModal(); const r = L.result; finish(); cb.onWin && cb.onWin(site, r); }
      else if (act === 'retry') { closeModal(); restart(); }
    });
  }

  $('lv-modal').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (b && modalHandler) modalHandler(b.dataset.act, b);
  });

  // ---------- শুরু / শেষ ----------
  let current = null;
  function start(site, callbacks) {
    cb = callbacks || {};
    current = site;
    const def = LEVELS[site.id];
    closeMap();
    L = build(def, site);
    def.setup(L, api);
    L.coinTotal = L.objects.filter((o) => o.kind === 'coin').length;
    $('lv-name').textContent = site.name;
    $('lv-era').textContent = site.era;
    root.classList.add('show');
    root.classList.toggle('touch', touch);
    root.setAttribute('aria-hidden', 'false');
    resize();
    L.cam.x = L.player.x * T + T / 2; L.cam.y = L.player.y * T;
    renderObjectives(); renderInventory(); renderStats();
    api.hud(null);
    $('lv-objectives').classList.toggle('collapsed', innerWidth < 760);
    $('lv-dialog').classList.remove('show');
    held = [];
    // শিরোনাম কার্ড
    const tc = $('lv-titlecard');
    tc.querySelector('.tc-name').textContent = site.name;
    tc.querySelector('.tc-era').textContent = site.era;
    tc.querySelector('.tc-chapter').textContent = `অধ্যায় ${bn(SITES.indexOf(site) + 1)}`;
    tc.classList.remove('show'); void tc.offsetWidth; tc.classList.add('show');
    L.titleT = 2.6;
    Sound.music('level');
    Sound.ambient(true);
    cancelAnimationFrame(raf);
    last = performance.now();
    raf = requestAnimationFrame(frame);
    setTimeout(() => { if (L && L.def === def) def.onStart && def.onStart(api); }, 2700);
  }
  function restart() { start(current, cb); }
  function finish() {
    cancelAnimationFrame(raf);
    root.classList.remove('show');
    root.setAttribute('aria-hidden', 'true');
    Sound.voice.stop();
    Sound.ambient(false);
    Sound.music('map');
    L = null; held = []; closeMap();
  }
  function exit() { finish(); cb.onExit && cb.onExit(); }

  addEventListener('keydown', onKey);
  addEventListener('keyup', onKey);
  addEventListener('blur', () => { held = []; shift = false; });
  addEventListener('resize', () => { if (L) resize(); });
  canvas.addEventListener('pointerdown', onPointer);
  canvas.addEventListener('pointermove', (e) => { mouse = { sx: e.clientX, sy: e.clientY }; });
  canvas.addEventListener('pointerleave', () => { mouse = null; });
  $('lv-dialog').addEventListener('click', (e) => {
    if (!L) return;
    const c = e.target.closest('.dlg-choice');
    if (c) { pickChoice(+c.dataset.i); return; }
    advanceDialog();
  });
  $('lv-dig').addEventListener('click', () => L && dig());
  $('lv-inventory').addEventListener('click', (e) => {
    const s = e.target.closest('.slot');
    if (!L || !s || L.busy || L.mode !== 'play') return;
    const it = L.items[+s.dataset.i];
    if (it && it.view) { L.busy = true; openView(it.view).then(() => { if (L) L.busy = false; }); }
  });
  $('lv-act').addEventListener('click', () => L && action());
  // মোবাইলের D-pad: চেপে ধরে রাখলে হাঁটে
  document.querySelectorAll('#lv-dpad button').forEach((b) => {
    const d = b.dataset.dir;
    const on = (e) => { e.preventDefault(); if (!held.includes(d)) held.push(d); b.classList.add('on'); };
    const off = () => { held = held.filter((k) => k !== d); b.classList.remove('on'); };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointerleave', off);
    b.addEventListener('pointercancel', off);
  });
  $('lv-back').addEventListener('click', () => {
    if (!L || L.mode === 'won') return;
    Sound.sfx('click');
    openModal(`
      <div class="lv-modal-icon">🗺</div>
      <h3>ম্যাপে ফিরে যাবে?</h3>
      <p>এই লেভেলের অগ্রগতি হারিয়ে যাবে।</p>
      <div class="lv-modal-actions">
        <button class="btn-primary" data-act="stay">থাকো</button>
        <button class="btn-ghost" data-act="leave">হ্যাঁ, ফিরে যাও</button>
      </div>`, (act) => { closeModal(); if (act === 'leave') exit(); });
  });
  $('lv-obj-toggle').addEventListener('click', () => { $('lv-objectives').classList.toggle('collapsed'); Sound.sfx('click'); });

  // ---------- মিনিম্যাপ ----------
  const MS = 10; // মিনিম্যাপের ভিত্তি ছবিতে এক ঘর কত পিক্সেল
  const PLACE_NAMES = {
    tomb: 'মাজার', mosque: 'মসজিদ', diwan: 'দিওয়ান-ই-আম', hut: 'ঘর', shrine: 'মাজার', shatgombuj: 'ষাট গম্বুজ মসজিদ',
    singledome: 'এক গম্বুজ মসজিদ', tower: 'ওয়াচটাওয়ার', panam: 'বাড়ি', panamBack: 'বাড়ি', nachghar: 'নাচঘর',
  };
  const BASE_KINDS = new Set(['building', 'tree', 'stele', 'gate', 'prop', 'decor']);
  const mini = { cv: $('lv-mini-cv'), big: $('lv-map-cv'), open: false, sig: '' };

  function mapBase() {
    const sig = L.objects.filter((o) => o.hidden).length + ':' + L.C;
    if (L.mapBase && mini.sig === sig) return L.mapBase;
    mini.sig = sig;
    const c = Art.canvas(L.C * MS, L.R * MS), g = c.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.drawImage(L.ground, 0, 0, L.C * T, L.R * T, 0, 0, L.C * MS, L.R * MS);
    const real = ctx;
    const list = L.objects.filter((o) => !o.hidden && BASE_KINDS.has(o.kind) && !o.push).sort((a, b) => (a.y + a.h) - (b.y + b.h));
    g.save(); g.scale(MS / T, MS / T);
    for (const o of list) {
      const px = o.x * T, py = o.y * T;
      try {
        if (o.draw) o.draw(g, 0, T, o);
        else if (o.kind === 'building') g.drawImage(o.sprite.img, px + o.sprite.ox, py + o.sprite.oy);
        else if (o.kind === 'tree' || o.kind === 'stele') g.drawImage(o.sprite.img, px + T / 2 - o.sprite.ax, py + T - o.sprite.ay + 4);
        else if (o.kind === 'gate') g.drawImage(o.sprite.img, px, py + T - o.sprite.ay + 6);
      } catch (e) { /* কোনো আঁকা না হলে বাদ */ }
    }
    g.restore();
    // হালকা পুরনো কাগজের রং
    g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(255,236,200,0.9)'; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-over';
    void real;
    L.mapBase = c;
    return c;
  }

  function mapFog() {
    if (!L.mapFog) { L.mapFog = Art.canvas(L.C, L.R); L.mapFogImg = L.mapFog.getContext('2d').createImageData(L.C, L.R); L.mapFogN = -1; }
    let n = 0; for (let i = 0; i < L.explored.length; i++) n += L.explored[i];
    if (n !== L.mapFogN) {
      L.mapFogN = n;
      const d = L.mapFogImg.data;
      for (let i = 0; i < L.explored.length; i++) { d[i * 4] = 22; d[i * 4 + 1] = 16; d[i * 4 + 2] = 9; d[i * 4 + 3] = L.explored[i] ? 0 : 205; }
      L.mapFog.getContext('2d').putImageData(L.mapFogImg, 0, 0);
    }
    return L.mapFog;
  }

  function placeName(o) {
    if (o.label) return o.label;
    if (o.kind === 'building' && PLACE_NAMES[o.style]) return PLACE_NAMES[o.style];
    if (o.kind === 'stele') return 'শিলাফলক';
    if (o.kind === 'npc') { const s = SPEAKERS[o.speaker || o.id] || (L.def.speakers || {})[o.speaker || o.id]; return s && s.name ? s.name.split(' ').slice(-2).join(' ') : ''; }
    return o.prompt || '';
  }

  // cv-তে পুরো ম্যাপ আঁকে; big হলে নামও লেখে। ফেরত দেয় ম্যাপের অবস্থান (ক্লিকের জন্য)
  function drawMap(cv, big) {
    const r = cv.getBoundingClientRect();
    if (r.width < 10) return null;
    const pd = Math.min(2, devicePixelRatio || 1);
    const w = Math.round(r.width * pd), h = Math.round(r.height * pd);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#16100a'; g.fillRect(0, 0, w, h);
    const pad = (big ? 14 : 4) * pd;
    const s = Math.min((w - pad * 2) / L.C, (h - pad * 2) / L.R);
    const ox = (w - L.C * s) / 2, oy = (h - L.R * s) / 2;
    g.setTransform(1, 0, 0, 1, ox, oy);
    g.imageSmoothingEnabled = true;
    g.drawImage(mapBase(), 0, 0, L.C * s, L.R * s);
    const ex = (x, y) => L.explored[Math.max(0, Math.min(L.R - 1, y)) * L.C + Math.max(0, Math.min(L.C - 1, x))];

    // বন্ধ দরজা আর ঠেলার পাথর
    for (const o of L.objects) {
      if (o.hidden || !ex(o.x, o.y)) continue;
      if (o.kind === 'door' && !o.open) { g.fillStyle = o.lockColor || '#8a5a2a'; g.fillRect(o.x * s, o.y * s + s * 0.2, o.w * s, s * 0.6); }
      if (o.push) { g.fillStyle = '#6d6a62'; g.fillRect(o.x * s + s * 0.12, o.y * s + s * 0.12, s * 0.76, s * 0.76); }
    }
    // খোঁড়া গর্ত
    g.strokeStyle = 'rgba(70,35,10,0.9)'; g.lineWidth = Math.max(1, s * 0.12);
    for (const hl of L.holes) { const cx = (hl.x + 0.5) * s, cy = (hl.y + 0.5) * s, k = s * 0.22; g.beginPath(); g.moveTo(cx - k, cy - k); g.lineTo(cx + k, cy + k); g.moveTo(cx + k, cy - k); g.lineTo(cx - k, cy + k); g.stroke(); if (big && hl.dir) { holeArrow(g, cx, cy, hl.dir, s / 30); g.strokeStyle = 'rgba(70,35,10,0.9)'; g.lineWidth = Math.max(1, s * 0.12); } }

    // কুয়াশা
    g.imageSmoothingEnabled = true;
    g.drawImage(mapFog(), 0, 0, L.C * s, L.R * s);

    // লাল বৃত্ত
    if (L.circle) {
      const c = L.circle;
      g.save(); g.strokeStyle = '#c0301c'; g.lineWidth = Math.max(1.5, s * 0.22); g.setLineDash([s * 0.6, s * 0.4]);
      g.beginPath(); g.arc((c.x + 0.5) * s, (c.y + 0.5) * s, c.r * s, 0, 7); g.stroke(); g.restore();
    }

    // কাজের চিহ্ন
    const labels = [];
    const pulse = 1 + Math.sin(L.t * 5) * 0.18;
    for (const o of L.objects) {
      if (o.hidden || !o.interact || o.push || o.kind === 'animal') continue;
      const mx = Math.min(L.C - 1, o.x + ((o.w / 2) | 0)), my = o.y;
      const seen = ex(mx, my) || ex(mx, o.y + o.h - 1);
      // বড় দালান দূর থেকেও চেনা যায়, তাই কুয়াশার ভেতরেও নাম দেখায়; বাকিগুলো দেখা হলে তবেই
      if (!seen && o.kind !== 'building') continue;
      const cx = (o.x + o.w / 2) * s, cy = (o.y + (o.kind === 'building' ? o.h / 2 : 0.5)) * s;
      const task = o.bubble && o.bubble(api);
      if (task) {
        const rr = Math.max(big ? 7 * pd : 3.2 * pd, s * 0.42) * pulse;
        g.fillStyle = o.optional ? '#8fd0ff' : '#f2c14e'; g.strokeStyle = o.optional ? '#123a5a' : '#4a2a05'; g.lineWidth = Math.max(1, pd * (big ? 1.6 : 1));
        g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.fill(); g.stroke();
        if (big) { g.fillStyle = o.optional ? '#123a5a' : '#4a2a05'; g.font = `bold ${Math.round(rr * 1.4)}px Hind Siliguri, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', cx, cy + 1); }
      } else if (o.kind === 'npc') {
        g.fillStyle = '#fff4d4'; g.strokeStyle = '#3a2a1a'; g.lineWidth = pd;
        g.beginPath(); g.arc(cx, cy, Math.max(2 * pd, s * 0.26), 0, 7); g.fill(); g.stroke();
      }
      if (big) { const nm = placeName(o); if (nm) labels.push({ x: cx, y: cy, nm, task, opt: o.optional, dim: !seen }); }
    }
    if (big) {
      g.font = `600 ${Math.round(12 * pd)}px Hind Siliguri, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'top';
      g.lineJoin = 'round';
      for (const lb of labels) {
        const ty = lb.y + Math.max(9 * pd, s * 0.55);
        g.lineWidth = 3.5 * pd; g.strokeStyle = 'rgba(20,12,5,0.9)'; g.strokeText(lb.nm, lb.x, ty);
        g.globalAlpha = lb.dim ? 0.6 : 1;
        g.fillStyle = lb.task ? (lb.opt ? '#bfe6ff' : '#ffe39a') : '#f3e2b5'; g.fillText(lb.nm, lb.x, ty);
        g.globalAlpha = 1;
      }
    }

    // খেলোয়াড়
    const [px, py] = playerPos();
    const cx = (px + 0.5) * s, cy = (py + 0.5) * s, rr = Math.max(big ? 6 * pd : 3.5 * pd, s * 0.4);
    g.fillStyle = `rgba(255,90,60,${0.25 + Math.sin(L.t * 4) * 0.12})`; g.beginPath(); g.arc(cx, cy, rr * 2.2, 0, 7); g.fill();
    const ang = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 }[L.player.dir] || 0;
    g.save(); g.translate(cx, cy); g.rotate(ang);
    g.fillStyle = '#ff5a3c'; g.strokeStyle = '#fff'; g.lineWidth = Math.max(1.2, pd * 1.4);
    g.beginPath(); g.moveTo(rr * 1.3, 0); g.lineTo(-rr * 0.9, -rr * 0.9); g.lineTo(-rr * 0.4, 0); g.lineTo(-rr * 0.9, rr * 0.9); g.closePath(); g.fill(); g.stroke();
    g.restore();
    return { ox: ox / pd, oy: oy / pd, s: s / pd, rect: r };
  }

  function drawMinimap() {
    if (!L) return;
    drawMap(mini.cv, false);
    if (mini.open && (L.dialog || L.mode !== 'play' || $('lv-modal').classList.contains('show'))) closeMap();
    if (mini.open) mini.layout = drawMap(mini.big, true);
  }
  function openMap() {
    if (!L || L.mode !== 'play' || L.dialog) return;
    mini.open = true; mini.big.style.aspectRatio = `${L.C} / ${L.R}`; $('lv-map').classList.add('show'); held = []; Sound.sfx('page');
    requestAnimationFrame(drawMinimap);
  }
  function closeMap() { mini.open = false; $('lv-map').classList.remove('show'); }
  $('lv-mini').addEventListener('click', () => { if (mini.open) closeMap(); else openMap(); });
  $('lv-map-close').addEventListener('click', (e) => { e.stopPropagation(); closeMap(); Sound.sfx('click'); });
  $('lv-map').addEventListener('click', (e) => { if (e.target.id === 'lv-map') closeMap(); });
  // বড় ম্যাপে চেনা জায়গায় চাপলে সেখানে হেঁটে যায়
  mini.big.addEventListener('click', (e) => {
    const m = mini.layout; if (!L || !m || L.busy) return;
    const tx = Math.floor((e.clientX - m.rect.left - m.ox) / m.s), ty = Math.floor((e.clientY - m.rect.top - m.oy) / m.s);
    if (tx < 0 || ty < 0 || tx >= L.C || ty >= L.R || !L.explored[ty * L.C + tx]) { toast('ওই জায়গা এখনো ঘুরে দেখা হয়নি।'); return; }
    const o = objectAt(tx, ty);
    closeMap();
    if (o && o.interact) goTo(tx, ty, o); else goTo(tx, ty);
  });

  // _debug কেবল পরীক্ষার জন্য
  return { start, has: (id) => !!LEVELS[id], _debug: () => ({ L, api, goTo, dig, advanceDialog, pickChoice, objectAt, tick: (dt) => { update(dt); draw(); drawMinimap(); }, openMap, closeMap }) };
})();
