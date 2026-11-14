// লেভেল ৫: সুন্দরবন — বাঘের চোখ এড়ানো আর জোয়ার-ভাটার চর
// টাইল: u কাদামাটি · h গোলপাতার ঝোপ (লুকানো যায়) · z কাদার চর (জোয়ারে ডোবে) · k নদী/খাল · b কাঠের সাঁকো
(function () {
  const C = 40, R = 30;
  const ISLAND = { x0: 34, y0: 5, x1: 36, y1: 20 };
  const FLAT = { x0: 29, y0: 12, x1: 33, y1: 14 };
  const PATROL = [[15, 4], [26, 4], [26, 16], [15, 16]];
  const SAFE = [9, 13]; // বাঘ দেখে ফেললে বনরক্ষী এখানে ফিরিয়ে আনেন
  const BANK = [28, 13]; // জোয়ারে ভেসে গেলে এখানে
  const TIDE_CYCLE = 26; // সেকেন্ড: ১১ ভাটা, ২ জোয়ার আসছে, ১১ জোয়ার, ২ ভাটা আসছে
  const inIsland = (x, y) => x >= ISLAND.x0 && x <= ISLAND.x1 && y >= ISLAND.y0 && y <= ISLAND.y1;

  const LOOKS = {
    ranger: { skin: '#9c6b4a', top: '#4f6b3a', bottom: '#3f5530', hat: 'safari', phase: 0.3 },
    mouyal: { skin: '#7a4a2e', top: '#c9b48a', bottom: '#5a3a7a', checks: true, gamchha: true, beard: '#2a2a2a', hair: '#1e140c', phase: 2 },
  };
  const ANIMALS = {
    deer: { name: 'চিত্রা হরিণ', draw: 'deer', fact: 'সুন্দরবনের চিত্রা হরিণের গায়ে সাদা ফোঁটা। বানরেরা গাছ থেকে কেওড়া পাতা ফেলে, হরিণেরা নিচে খায়!' },
    monkey: { name: 'রেসাস বানর', draw: 'monkey', fact: 'বানরেরা গাছের উপর থেকে বাঘ দেখলে ডেকে উঠে সবাইকে সাবধান করে দেয়।' },
    kingfisher: { name: 'মাছরাঙা', draw: 'kingfisher', fact: 'সুন্দরবনে কয়েক রকমের মাছরাঙা আছে। ঝুপ করে পানিতে ডুব দিয়ে মাছ ধরে।' },
    crab: { name: 'লাল কাঁকড়া', draw: 'crab', fact: 'ভাটার সময় কাদার চরে হাজার হাজার লাল কাঁকড়া বেরিয়ে আসে, মানুষ দেখলেই গর্তে লুকায়।' },
  };

  function build() {
    const g = [];
    for (let y = 0; y < R; y++) g.push(new Array(C).fill('u'));
    const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < C && y < R) g[y][x] = t; };
    const rect = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, t); };

    rect(0, 0, 4, R - 1, 'k'); // পশ্চিমের নদী
    rect(C - 3, 0, C - 1, R - 1, 'k'); // পূর্বের নদী
    rect(2, 14, 4, 14, 'b'); // জেটি
    rect(5, 21, 28, 22, 'k'); rect(9, 21, 9, 22, 'b'); // দক্ষিণের খাল আর সাঁকো
    rect(29, 0, 33, R - 1, 'k'); // চরের খাল
    rect(FLAT.x0, FLAT.y0, FLAT.x1, FLAT.y1, 'z');
    // গোলপাতার ঝোপ
    rect(13, 9, 20, 9, 'h'); rect(17, 10, 17, 11, 'h'); rect(22, 12, 24, 13, 'h'); rect(19, 6, 20, 7, 'h');
    rect(11, 3, 12, 4, 'h'); rect(6, 24, 7, 24, 'h'); rect(25, 24, 26, 25, 'h'); rect(35, 9, 35, 10, 'h');
    rect(28, 11, 28, 15, 'h'); rect(27, 12, 27, 14, 'h'); // চর পারের ঘাটে লুকানোর ঝোপ

    const objects = [];
    const add = (o) => objects.push(o);
    add({ id: 'office', kind: 'building', style: 'hut', x: 6, y: 8, w: 3, h: 3, door: { x: 7, y: 11 }, interact: true, prompt: 'বন অফিস' });
    add({ id: 'tower', kind: 'building', style: 'tower', x: 10, y: 15, w: 2, h: 2, door: { x: 12, y: 16 }, interact: true, prompt: 'ওয়াচটাওয়ারে ওঠো',
      bubble: (api) => api.isDone('talk') && !api.isDone('tower') });
    add({ id: 'ranger', kind: 'npc', look: LOOKS.ranger, x: 9, y: 12, interact: true, prompt: 'কথা বলো', bubble: (api) => !api.isDone('talk') });
    add({ id: 'mouyal', kind: 'npc', look: LOOKS.mouyal, x: 12, y: 25, interact: true, prompt: 'কথা বলো',
      bubble: (api) => api.isDone('talk') && (!api.flag('quest') || api.has('smoker')) && !api.isDone('smoker') });
    add({ id: 'smoker', kind: 'pickup', x: 21, y: 9, solid: false, interact: true, prompt: 'তুলে নাও',
      draw: (ctx, t, T, o) => Art.smoker(ctx, o.x * T + T / 2, o.y * T + T - 4, t) });
    for (const [id, x, y] of [['deer', 24, 26], ['monkey', 6, 27], ['kingfisher', 21, 20], ['crab', 27, 27]]) {
      add({ id, kind: 'animal', x, y, solid: false, interact: true, prompt: 'ছবি তোলো', optional: true,
        bubble: (api) => api.has('camera') && !(api.flag('photos') || {})[id],
        draw: (ctx, t, T, o) => Art[ANIMALS[id].draw](ctx, o.x * T + T / 2, o.y * T + T - 4, t + o.x) });
    }
    const boat = (id, x, y, len) => add({ id, kind: 'decor', x, y, w: 1, h: 1, water: true, draw: (ctx, t, T, o) => Art.boat(ctx, o.x * T, o.y * T, t + o.x, len) });
    boat('boat1', 2.4, 16, 100); boat('boat2', 16, 21.9, 90); boat('boat3', 38.2, 24, 80);

    // ম্যানগ্রোভ বন: সুন্দরী আর কেওড়া
    const free = (x, y) => (g[y][x] === 'u') && !objects.some((o) => x >= Math.floor(o.x) && x < o.x + (o.w || 1) && y >= o.y - 1 && y < o.y + (o.h || 1) + 1);
    const tree = (x, y, style) => { if (x >= 0 && y >= 0 && x < C && y < R && free(x, y)) add({ id: `t${x}_${y}`, kind: 'tree', style, x, y }); };
    for (let x = 5; x <= 28; x++) { tree(x, 0, x % 3 ? 'mangrove' : 'keora'); if (x % 2) tree(x, 1, 'mangrove'); tree(x, R - 1, x % 2 ? 'keora' : 'mangrove'); }
    for (let y = 2; y <= 28; y++) if (y < 7 || y > 19) tree(5, y, y % 2 ? 'mangrove' : 'keora');
    const LIST = [
      [7, 3], [9, 2], [8, 5], [10, 6], [13, 2], [6, 6], [12, 6], [6, 16], [7, 18], [6, 19], [11, 19], [13, 18], [13, 13],
      [18, 6], [23, 6], [19, 13], [21, 14], [24, 9], [17, 13], [22, 7], [20, 11], [24, 15],
      [14, 19], [18, 19], [24, 19], [27, 19], [27, 8], [28, 4], [27, 17], [28, 10], [28, 16], [14, 3], [16, 2], [24, 2], [20, 2],
      [8, 23], [10, 27], [14, 27], [17, 24], [19, 27], [22, 23], [21, 26], [16, 28], [26, 23], [28, 24], [23, 28], [7, 23], [5, 25],
      [35, 6], [36, 19], [34, 17], [36, 13], [34, 8],
    ];
    LIST.forEach(([x, y], i) => tree(x, y, i % 3 ? 'mangrove' : 'keora'));
    return { cols: C, rows: R, tiles: g.map((r) => r.join('')), objects, flocks: [], start: { x: 3, y: 14 } };
  }

  function setup(L, api) {
    const pick = (a) => a[(Math.random() * a.length) | 0];
    const freeTile = (x, y) => L.at(x, y) === 'u' && !L.solid[y * L.C + x] && !L.objects.some((o) => o.kind !== 'decor' && x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h);
    const isl = [];
    for (let y = ISLAND.y0; y <= ISLAND.y1; y++) for (let x = ISLAND.x0; x <= ISLAND.x1; x++) if (freeTile(x, y) && !(y >= 12 && y <= 14 && x === 34)) isl.push({ x, y });
    L.treasure = pick(isl);
    [[7, 4], [24, 14], [16, 26]].forEach(([x, y], i) => L.objects.push({ id: `coin${i}`, kind: 'coin', x, y, w: 1, h: 1, solid: false }));
    L.flags.tiger = { x: PATROL[0][0], y: PATROL[0][1], wp: 1, ang: 0, pause: 0, moving: true, look: 0 };
    L.flags.tideT = 0;
    L.flags.cool = 0;
    L.flags.spotted = 0;
    L.flags.photos = {};
  }

  // জোয়ারের মাত্রা: ০ = পুরো ভাটা, ১ = পুরো জোয়ার
  function tideLevel(t) {
    const p = t % TIDE_CYCLE;
    if (p < 11) return 0;
    if (p < 13) return (p - 11) / 2;
    if (p < 24) return 1;
    return 1 - (p - 24) / 2;
  }

  const lines = (who, ...texts) => texts.map((text) => ({ who, text }));
  const ask = (who, text, choices) => ({ who, text, choices });
  const bn = (n) => BN_DIGITS(n);

  window.LEVELS.sundarban = {
    digs: 3,
    build,
    setup,
    diggable: ['u'],
    digHint: 'এখানে খোঁড়া যাবে না। কাদামাটির উপর দাঁড়িয়ে খোঁড়ো।',
    hideTiles: ['h'],
    coinName: 'হারানো তামার পয়সা',
    speakers: {
      ranger: { name: 'বনরক্ষী রফিক ভাই', face: '🧑🏽‍✈️' },
      mouyal: { name: 'মৌয়াল জব্বার মামা', face: '🐝' },
    },
    objectives: [
      { id: 'talk', text: 'জেটির পাশে বনরক্ষী রফিক ভাইয়ের সাথে কথা বলো' },
      { id: 'tower', text: 'ওয়াচটাওয়ারে উঠে চারপাশ দেখো' },
      { id: 'smoker', text: 'বাঘের চোখ এড়িয়ে মৌয়ালের ধোঁয়ার কুণ্ডলী এনে দাও' },
      { id: 'tide', text: 'ভাটার সময় কাদার চর পেরিয়ে দ্বীপে যাও' },
      { id: 'dig', text: 'দ্বীপে খুঁড়ে রত্নখণ্ড বের করো' },
      { id: 'photos', text: 'বোনাস: ক্যামেরায় ৪টি প্রাণীর ছবি তোলো', optional: true },
    ],
    historyCard: 'সুন্দরবন পৃথিবীর সবচেয়ে বড় ম্যানগ্রোভ বন, বাংলাদেশ আর ভারতের উপকূল জুড়ে বিস্তৃত। ১৯৯৭ সালে এর বাংলাদেশ অংশ ইউনেস্কো বিশ্ব ঐতিহ্যের স্বীকৃতি পায়। দিনে দুবার জোয়ার-ভাটায় বনের খাল আর চর ডোবে-ভাসে। এখানে থাকে রয়েল বেঙ্গল টাইগার, চিত্রা হরিণ, কুমির আর অসংখ্য পাখি। সুন্দরী গাছের নাম থেকেই বনের নাম সুন্দরবন, এমনটাই প্রচলিত। মৌয়াল, বাওয়ালি আর জেলেরা জীবিকার জন্য এই বনের উপর নির্ভর করেন।',

    onStart(api) {
      api.say(lines('narrator',
        'খুলনা থেকে নৌকায় অনেক পথ পেরিয়ে তুমি পৌঁছালে সুন্দরবনের গহিনে। চারপাশে সুন্দরী আর কেওড়া গাছ, কাদায় খাড়া খাড়া শ্বাসমূল।',
        'বাতাসে নোনা পানির গন্ধ। দূরে কোথাও বানর ডাকছে… এই বনেই থাকে **রয়েল বেঙ্গল টাইগার**।',
        'জেটির পাশে সবুজ পোশাকে একজন **বনরক্ষী** দাঁড়িয়ে।'));
    },

    update(api, dt) {
      const L = api.L, f = L.flags;
      // ---- জোয়ার-ভাটা ----
      f.tideT += dt;
      const lv = tideLevel(f.tideT);
      f.tideLv = lv;
      const flooded = lv > 0.5;
      if (flooded !== f.flooded) {
        f.flooded = flooded;
        for (let y = FLAT.y0; y <= FLAT.y1; y++) for (let x = FLAT.x0; x <= FLAT.x1; x++) L.solid[y * L.C + x] = flooded ? 1 : 0;
        if (api.isDone('tower')) api.toast(flooded ? '🌊 <b>জোয়ার</b> এসেছে! কাদার চর ডুবে গেছে।' : '🏖 <b>ভাটা</b> শুরু! কাদার চর ভেসে উঠেছে, পার হওয়া যাবে।', 2600);
      }
      const p = L.player;
      if (flooded && L.at(p.x, p.y) === 'z') {
        api.splash(p.x, p.y);
        api.teleport(BANK[0], BANK[1]);
        api.toast('🌊 জোয়ারের পানিতে ভেসে পাড়ে ফিরে এলে! ভাটার জন্য অপেক্ষা করো।', 3200);
      }
      const p2 = f.tideT % TIDE_CYCLE;
      const left = Math.ceil(p2 < 11 ? 11 - p2 : p2 < 13 ? 13 - p2 : p2 < 24 ? 24 - p2 : TIDE_CYCLE - p2);
      const label = p2 < 11 ? `🏖 ভাটা · চর পার হওয়া যাবে · ${bn(left)} সে.` : p2 < 13 ? `⚠️ জোয়ার আসছে! · ${bn(left)} সে.` : p2 < 24 ? `🌊 জোয়ার · চর ডুবে আছে · ${bn(left)} সে.` : `⏳ ভাটা আসছে · ${bn(left)} সে.`;
      const html = `<span>${label}</span><span class="tide-bar"><i style="width:${Math.round(lv * 100)}%"></i></span>`;
      if (html !== f.hudHtml && api.isDone('tower')) { f.hudHtml = html; api.hud(html); document.getElementById('lv-custom').classList.toggle('danger', p2 >= 11 && p2 < 13); }

      // ---- বাঘের টহল ----
      const tg = f.tiger;
      if (tg.pause > 0) {
        tg.pause -= dt; tg.moving = false;
        tg.ang = tg.baseAng + Math.sin((1.6 - tg.pause) * 2.2) * 0.9; // এদিক-ওদিক তাকায়
      } else {
        const [wx, wy] = PATROL[tg.wp];
        const dx = wx - tg.x, dy = wy - tg.y, d = Math.hypot(dx, dy);
        const sp = 1.5 * dt;
        tg.moving = true;
        if (d <= sp) {
          tg.x = wx; tg.y = wy; tg.wp = (tg.wp + 1) % PATROL.length;
          tg.pause = 1.6; tg.baseAng = tg.ang;
        } else { tg.x += (dx / d) * sp; tg.y += (dy / d) * sp; tg.ang = Math.atan2(dy, dx); }
      }
      f.cool -= dt;
      if (L.busy || f.cool > 0) return;
      const [px, py] = api.playerPos();
      const vx = px - tg.x, vy = py - tg.y, dist = Math.hypot(vx, vy);
      let diff = Math.atan2(vy, vx) - tg.ang;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const hidden = L.at(p.x, p.y) === 'h';
      const seen = dist < 1.1 || (!hidden && dist < 4.5 && Math.abs(diff) < 0.7);
      if (seen) {
        f.cool = 1.5; f.spotted++;
        Sound.sfx('roar');
        setTimeout(() => Sound.sfx('whistle'), 500);
        api.teleport(SAFE[0], SAFE[1]);
        api.toast(f.spotted === 1
          ? '🐅 বাঘ দেখে ফেলেছে! রফিক ভাই বাঁশি বাজিয়ে তোমাকে নিরাপদে ফিরিয়ে আনলেন। <b>ঝোপে লুকিয়ে</b> চলো, আর বাঘের সামনের আলোয় যেও না।'
          : '🐅 আবার বাঘের চোখে পড়ে গেলে! বাঘ যখন অন্যদিকে তাকিয়ে, তখন এগোও।', 4200);
      }
      // দ্বীপে পৌঁছানো
      if (!api.isDone('tide') && inIsland(p.x, p.y)) {
        api.complete('tide');
        Sound.sfx('right');
        api.toast('🏝 চরের দ্বীপে পৌঁছে গেছ! এবার কম্পাস দেখে খোঁড়ো।', 3200);
      }
    },

    drawWorld(ctx, api, T) {
      const L = api.L, f = L.flags, lv = f.tideLv || 0;
      // জোয়ারের পানি
      if (lv > 0) {
        for (let y = FLAT.y0; y <= FLAT.y1; y++) for (let x = FLAT.x0; x <= FLAT.x1; x++) {
          ctx.fillStyle = `rgba(61,111,94,${lv * 0.92})`; ctx.fillRect(x * T, y * T, T, T);
          ctx.strokeStyle = `rgba(220,245,240,${lv * 0.35})`; ctx.lineWidth = 1.5;
          const ph = L.t * 1.5 + x + y * 2;
          ctx.beginPath(); ctx.moveTo(x * T + 10 + Math.sin(ph) * 4, y * T + 20); ctx.quadraticCurveTo(x * T + 18, y * T + 16, x * T + 26 + Math.sin(ph) * 4, y * T + 20); ctx.stroke();
        }
      }
      // বাঘের দৃষ্টির আলো
      const tg = f.tiger;
      const cx = tg.x * T + T / 2, cy = tg.y * T + T / 2;
      const grd = ctx.createRadialGradient(cx, cy, 10, cx, cy, 4.5 * T);
      grd.addColorStop(0, 'rgba(255,120,40,0.4)'); grd.addColorStop(1, 'rgba(255,120,40,0.1)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 4.5 * T, tg.ang - 0.7, tg.ang + 0.7); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,150,70,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]);
      Art.tiger(ctx, cx, cy, tg.ang, L.t, tg.moving);
    },

    interact: {
      async ranger(api) {
        if (!api.isDone('talk')) {
          const c = await api.say([
            ...lines('ranger',
              'স্বাগতম! আমি বনরক্ষী রফিক। এটা **সুন্দরবন**, পৃথিবীর সবচেয়ে বড় ম্যানগ্রোভ বন। ১৯৯৭ সালে ইউনেস্কো একে বিশ্ব ঐতিহ্য ঘোষণা করেছে।',
              'এই বনে **বাঘ** আছে। নিয়ম একটাই: বাঘের সামনে কখনো যাবে না। বাঘ যেদিকে তাকায়, মাটিতে কমলা আলো দেখবে। ওই আলোয় পা দিয়ো না।',
              'গোলপাতার **ঝোপে** লুকালে বাঘ তোমাকে দেখবে না। আর যদি দেখেও ফেলে, আমি বাঁশি বাজিয়ে তোমাকে ফিরিয়ে আনব।'),
            ask('ranger', 'তা, এত গহিনে কী মনে করে?', ['হারানো রত্নখণ্ড খুঁজছি', 'বনের নাম সুন্দরবন কেন?']),
          ]);
          await api.say(lines('ranger',
            c === 0 ? 'রত্নখণ্ড! পূর্ব দিকে খালের ওপারে একটা চর আছে, ভাটার সময় ছাড়া যাওয়া যায় না। শুনেছি ওখানে কিছু পোঁতা আছে।'
              : 'এখানকার সবচেয়ে বেশি গাছ **সুন্দরী**। প্রচলিত আছে, সেই গাছের নাম থেকেই সুন্দরবন। দেখো, গাছের গোড়ায় কাদা থেকে খাড়া খাড়া **শ্বাসমূল** উঠে আছে, নোনা কাদায় গাছ এভাবেই শ্বাস নেয়!',
            'এই **কম্পাসটা** রাখো। আর একটা **ক্যামেরা** দিচ্ছি। বনের প্রাণীদের ছবি তুললে আমাদের গবেষণায় কাজে লাগবে, তবে দূর থেকে!',
            'আগে **ওয়াচটাওয়ারে** উঠে চারপাশটা দেখে নাও।'));
          api.give({ id: 'compass', icon: '🧭', name: 'পুরনো কম্পাস' });
          api.give({ id: 'camera', icon: '📷', name: 'ক্যামেরা' });
          api.complete('talk');
          return;
        }
        const hint = !api.isDone('tower') ? 'ওয়াচটাওয়ারে ওঠো, পুরো বন দেখা যায়।'
          : !api.isDone('smoker') ? 'দক্ষিণে খালের ধারে মৌয়াল জব্বার মামার কাছে যাও। ওঁর কোদাল আছে।'
          : !api.isDone('tide') ? 'উপরে জোয়ার-ভাটার ঘড়ি দেখো। ভাটা শুরু হলেই তাড়াতাড়ি চর পার হবে।'
          : 'দ্বীপে কম্পাস দেখে খোঁড়ো।';
        const MENU = ['এখন কী করব?', 'জোয়ার-ভাটা কেন হয়?', 'আচ্ছা, আসি'];
        let c = await api.say([ask('ranger', 'আর কিছু?', MENU)]);
        while (c !== 2 && c !== undefined) {
          const answer = [[hint], ['চাঁদের টানে সাগরের পানি দিনে দুবার ফুলে ওঠে, আবার নেমে যায়। জোয়ারে বনের খাল আর চর পানিতে ডোবে, ভাটায় কাদা ভেসে ওঠে।', 'এই খেলায় ঘড়িটা একটু দ্রুত চলে, নইলে ছয় ঘণ্টা অপেক্ষা করতে হতো!']][c];
          c = await api.say([...lines('ranger', ...answer), ask('ranger', 'আর কিছু?', MENU)]);
        }
      },

      async office(api) {
        await api.say(lines('narrator', 'বন বিভাগের ছোট অফিস। দেয়ালে সুন্দরবনের মানচিত্র আর লেখা: "বাঘ, হরিণ, পাখি — সবাইকে বাঁচতে দিন। বনে আগুন জ্বালাবেন না।"'));
      },

      async tower(api) {
        if (api.isDone('tower')) { await api.say(lines('narrator', 'টাওয়ার থেকে বনের সবুজ ছাদ আর আঁকাবাঁকা খাল দেখা যায়। দূরে চরটা।')); return; }
        await api.say(lines('narrator',
          'মই বেয়ে উপরে উঠলে। চারদিকে যতদূর চোখ যায় শুধু সবুজ বন, আর রুপালি খালের জাল।',
          'বনের মাঝখানে একটা **বাঘ** ঘুরে বেড়াচ্ছে, চারকোনা পথে চক্কর দেয়, কোণে থেমে এদিক-ওদিক তাকায়।',
          'পূর্বে খালের ওপারে চর। ভাটায় খালের মধ্যে **কাদার পথ** ভেসে ওঠে। চরের এক জায়গায় পুরনো একটা খুঁটি পোঁতা…'));
        api.revealAll();
        api.complete('tower');
        const tr = api.L.treasure;
        api.showCircle({ x: tr.x, y: tr.y + Math.round((api.rand() - 0.5) * 2), r: 2.3 });
        api.clue('চরের দ্বীপে <b>পুরনো খুঁটির কাছে</b> ধন। খাল পার হতে হবে <b>ভাটার সময়</b>');
        api.toast('🌊 উপরে এখন জোয়ার-ভাটার ঘড়ি দেখা যাবে।', 3000);
      },

      async mouyal(api) {
        if (api.isDone('smoker')) { await api.say(lines('mouyal', 'ধোঁয়া ছাড়া মৌচাকে হাত দেওন যায় না। তুমি বাঁচাইলা! এখন যাও, চরে ধন খোঁজো।')); return; }
        if (api.has('smoker')) {
          api.take('smoker');
          api.complete('smoker');
          await api.say(lines('mouyal',
            'আরে! আমার **ধোঁয়ার কুণ্ডলী**! বাঘের এলাকা থিকা আনলা? সাহস আছে তোমার!',
            'এই নাও আমার **কোদাল**। চরে খুঁড়তে কামে লাগবে। আর মনে রাইখো, জোয়ার আইলে চর থিকা সইরা যাইবা।'));
          api.give({ id: 'shovel', icon: '⛏', name: 'মৌয়ালের কোদাল' });
          return;
        }
        const c = await api.say([
          ...lines('mouyal',
            'আসো আসো। আমি জব্বার, মৌয়াল। সুন্দরবনের গাছে গাছে মৌচাক খুঁজি, মধু কাটি।',
            'মৌচাকে হাত দেওনের আগে **গোলপাতার ধোঁয়া** দেই, মৌমাছি তাইলে শান্ত থাকে। কিন্তু সকালে বাঘের ডাক শুইনা দৌড়াইতে গিয়া আমার ধোঁয়ার কুণ্ডলীটা ফালাইয়া আইছি…'),
          ask('mouyal', 'বনের মাঝখানে, বাঘ যেখানে চক্কর দেয়। আইনা দিবা? বদলে আমার কোদালটা দিমু।', ['আমি এনে দেব, মামা!', 'বাঘের এলাকায়? ভয় লাগে…']),
        ]);
        api.flag('quest', true);
        await api.say(lines('mouyal', c === 0
          ? 'বাঘ যখন অন্যদিকে তাকায়, তখন ঝোপে ঝোপে আগাইবা। গোলপাতার ঝোপের সারিটা সোজা কুণ্ডলীর কাছে গেছে।'
          : 'ভয় তো লাগবই, আমরাও ভয় পাই! তয় চালাক হইলে বাঘের চোখ এড়ান যায়। ঝোপে লুকাইয়া, বাঘ পিছন ফিরলে তবেই আগাইবা।'));
        api.clue('ধোঁয়ার কুণ্ডলী বনের মাঝখানে। <b>গোলপাতার ঝোপে</b> লুকিয়ে এগোও');
      },

      async smoker(api, o) {
        o.hidden = true;
        api.give({ id: 'smoker', icon: '💨', name: 'ধোঁয়ার কুণ্ডলী' });
        api.toast('💨 ধোঁয়ার কুণ্ডলী পেয়েছ! এবার চুপিচুপি মৌয়ালের কাছে ফেরো।', 3000);
      },

      async deer(api, o) { await photo(api, o); },
      async monkey(api, o) { await photo(api, o); },
      async kingfisher(api, o) { await photo(api, o); },
      async crab(api, o) { await photo(api, o); },
    },
  };

  async function photo(api, o) {
    const a = ANIMALS[o.id];
    if (!api.has('camera')) { await api.say(lines('narrator', `একটা ${a.name}! ক্যামেরা থাকলে ছবি তোলা যেত।`)); return; }
    const photos = api.flag('photos');
    if (photos[o.id]) { await api.say(lines('narrator', `${a.name}-এর ছবি আগেই তুলেছ।`)); return; }
    photos[o.id] = true;
    Sound.sfx('shutter');
    document.getElementById('level').classList.add('flash');
    setTimeout(() => document.getElementById('level').classList.remove('flash'), 250);
    const n = Object.keys(photos).length;
    api.floatText(o.x, o.y, `📸 ${a.name} (${bn(n)}/৪)`);
    await api.say(lines('narrator', `ক্লিক! **${a.name}**-এর ছবি তোলা হলো। ${a.fact}`));
    if (n === 4) {
      api.complete('photos');
      api.flag('sightBonus', 1.6);
      api.give({ id: 'lantern', icon: '🔦', name: 'বনরক্ষীর টর্চ' });
      api.addDigs(1);
      await api.say(lines('ranger', 'চারটা ছবিই তুলেছ! দারুণ কাজ। এই নাও আমার **টর্চ**, আর বাড়তি একটা কোদালের ফলা। **একবার** বেশি খুঁড়তে পারবে।'));
    }
  }
})();
