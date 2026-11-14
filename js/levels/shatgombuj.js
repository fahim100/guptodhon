// লেভেল ৪: ষাট গম্বুজ মসজিদ — গম্বুজ গোনা আর কুমিরের দিঘি
// টাইল: g ঘাস · p ইটের পথ · r পুরনো ইটের সীমানা-দেয়াল · w দিঘি · s পা রাখার পাথর · f ফুল
(function () {
  const C = 40, R = 32;
  const ISLAND = { x0: 31, y0: 25, x1: 34, y1: 27 };
  const STONES = [[27, 21], [27, 22], [27, 23], [28, 23], [29, 23], [29, 24], [29, 25], [30, 25]];
  const onIsland = (x, y) => x >= ISLAND.x0 && x <= ISLAND.x1 && y >= ISLAND.y0 && y <= ISLAND.y1;

  const LOOKS = {
    khadem: { skin: '#9c6b4a', top: '#f2efe6', bottom: '#f2efe6', beard: '#e9e6de', hat: 'tupi', phase: 1.5 },
    teacher: { skin: '#b07a52', top: '#8e3b6e', bottom: '#8e3b6e', border: '#f2c14e', saree: true, hair: '#1e140c', bun: true, glasses: true, phase: 2.5 },
  };

  function build() {
    const g = [];
    for (let y = 0; y < R; y++) g.push(new Array(C).fill('g'));
    const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < C && y < R) g[y][x] = t; };
    const rect = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, t); };

    // পথ
    rect(26, 11, C - 2, 11, 'p'); // পূর্বের রাস্তা
    rect(11, 2, 11, 30, 'p'); rect(2, 30, C - 3, 30, 'p'); rect(2, 21, 11, 21, 'p');
    rect(27, 12, 27, 19, 'p'); rect(C - 3, 12, C - 3, 30, 'p');
    rect(24, 20, C - 3, 20, 'p'); rect(27, 19, C - 3, 19, 'p');
    rect(12, 22, 23, 22, 'p'); rect(17, 22, 17, 29, 'p');
    // ঘোড়াদিঘি
    rect(2, 4, 10, 20, 'w');
    // মসজিদের সীমানা-দেয়াল আর ভেতরের লন
    rect(13, 3, 26, 19, 'r'); rect(14, 4, 25, 18, 'g');
    rect(26, 10, 26, 12, 'p'); rect(24, 4, 25, 18, 'p');
    // খান জাহান আলীর মাজারের দিঘি (ঠাকুর দিঘি), দ্বীপ আর পাথর
    rect(24, 21, C - 3, 28, 'w');
    rect(ISLAND.x0, ISLAND.y0, ISLAND.x1, ISLAND.y1, 'g');
    for (const [x, y] of STONES) set(x, y, 's');
    // ফুল
    for (const [x, y] of [[15, 25], [20, 26], [6, 24], [31, 14], [14, 2]]) rect(x, y, x + 1, y + 1, 'f');

    const objects = [];
    const add = (o) => objects.push(o);
    add({ id: 'mosque', kind: 'building', style: 'shatgombuj', x: 15, y: 5, w: 9, h: 13, door: { x: 24, y: 11 }, interact: true, prompt: 'মসজিদ দেখো' });
    add({ id: 'mazar', kind: 'building', style: 'singledome', x: 33, y: 15, w: 3, h: 3, door: { x: 34, y: 18 }, interact: true, prompt: 'মাজার দেখো' });
    add({ id: 'hut', kind: 'building', style: 'hut', x: 3, y: 23, w: 3, h: 3, door: { x: 4, y: 26 }, interact: true, prompt: 'কুঁড়েঘরে ঢোকো',
      bubble: (api) => api.isDone('talk') && !api.has('shovel') });
    add({ id: 'ghat', kind: 'door', x: 27, y: 20, lockColor: '#7a7f86', interact: true, prompt: 'ঘাটের তালা', door: { x: 27, y: 19 },
      bubble: (api) => api.has('ghatKey') });
    add({ id: 'khadem', kind: 'npc', look: LOOKS.khadem, x: 25, y: 13, interact: true, prompt: 'কথা বলো',
      bubble: (api) => !api.isDone('talk') || (api.has('shovel') && !api.isDone('domes')) });
    add({ id: 'teacher', kind: 'npc', look: LOOKS.teacher, x: 18, y: 24, interact: true, prompt: 'কথা বলো', optional: true, bubble: (api) => !api.isDone('timeline') });
    add({ id: 'kid1', kind: 'npc', style: 'kid', x: 15, y: 27 });
    add({ id: 'kid2', kind: 'npc', style: 'kid', x: 20, y: 28 });
    add({ id: 'boat', kind: 'decor', x: 6, y: 12, w: 1, h: 1, water: true, draw: (ctx, t, T, o) => Art.boat(ctx, o.x * T, o.y * T, t, 90) });

    // গাছ: নারকেল আর আম
    const free = (x, y) => (g[y][x] === 'g' || g[y][x] === 'f') && !objects.some((o) => x >= o.x && x < o.x + (o.w || 1) && y >= o.y - 1 && y < o.y + (o.h || 1) + 1);
    const tree = (x, y, style) => { if (free(x, y)) add({ id: `t${x}_${y}`, kind: 'tree', style, x, y }); };
    for (let x = 0; x < C; x += 1) { tree(x, 0, x % 3 ? 'palm' : 'round'); tree(x, R - 1, x % 3 ? 'round' : 'palm'); }
    for (let y = 1; y < R - 1; y++) { tree(0, y, y % 2 ? 'palm' : 'round'); tree(C - 1, y, y % 2 ? 'round' : 'palm'); }
    for (const [x, y, s] of [[1, 3, 'palm'], [1, 10, 'palm'], [1, 16, 'palm'], [12, 3, 'round'], [28, 3, 'palm'], [31, 5, 'round'], [34, 3, 'palm'], [30, 8, 'light'],
      [36, 6, 'palm'], [29, 14, 'palm'], [33, 13, 'round'], [13, 23, 'round'], [22, 24, 'light'], [13, 28, 'palm'], [8, 23, 'palm'], [7, 27, 'round'],
      [14, 5, 'palm'], [14, 17, 'palm'], [22, 4, 'light'], [22, 28, 'round'], [35, 14, 'palm']]) tree(x, y, s);

    const flocks = [{ x: 24.2, y: 6, w: 1.6, h: 10, n: 6 }, { x: 13, y: 21.6, w: 9, h: 1, n: 5 }];
    return { cols: C, rows: R, tiles: g.map((r) => r.join('')), objects, flocks, start: { x: C - 3, y: 11 } };
  }

  function setup(L, api) {
    const pick = (a) => a[(Math.random() * a.length) | 0];
    const isl = [];
    for (let y = ISLAND.y0; y <= ISLAND.y1; y++) for (let x = ISLAND.x0; x <= ISLAND.x1; x++) if (!(x === 31 && y === 25)) isl.push({ x, y });
    L.treasure = pick(isl);
    const grass = (test) => { const c = []; for (let y = 2; y < L.R - 2; y++) for (let x = 2; x < L.C - 2; x++) if (L.at(x, y) === 'g' && !L.solid[y * L.C + x] && !onIsland(x, y) && test(x, y)) c.push({ x, y }); return c; };
    [grass((x, y) => x >= 14 && x <= 23 && y >= 4 && y <= 18), grass((x, y) => y >= 22 && y <= 29 && x <= 23), grass((x, y) => x >= 28 && y <= 18)]
      .forEach((c, i) => { const p = pick(c); L.objects.push({ id: `coin${i}`, kind: 'coin', x: p.x, y: p.y, w: 1, h: 1, solid: false }); });
    // কুমির: দুটো আলাদা সারিতে টহল দেয়
    L.flags.crocs = [
      { x: 25, y: 22, x0: 24.4, x1: 36.6, v: 1.9, dir: 1, t: 0, ph: 0 },
      { x: 30, y: 24, x0: 24.4, x1: 30.4, v: 1.3, dir: -1, t: 0, ph: 2 },
    ];
    L.flags.hitCool = 0;
    L.flags.hits = 0;
  }

  const lines = (who, ...texts) => texts.map((text) => ({ who, text }));
  const ask = (who, text, choices) => ({ who, text, choices });

  window.LEVELS.shatgombuj = {
    digs: 3,
    build,
    setup,
    coinName: 'সুলতানি আমলের মুদ্রা',
    speakers: {
      khadem: { name: 'খাদেম হাফিজ চাচা', face: '👳🏽‍♂️' },
      teacher: { name: 'রিনা আপা, শিক্ষক', face: '👩🏽‍🏫' },
    },
    objectives: [
      { id: 'talk', text: 'মসজিদের ফটকে খাদেম হাফিজ চাচার সাথে কথা বলো' },
      { id: 'shovel', text: 'ঘোড়াদিঘির পাড়ের কুঁড়েঘর থেকে কোদাল নাও' },
      { id: 'domes', text: 'ছাদের গম্বুজ গুনে খাদেমকে মোট সংখ্যা বলো' },
      { id: 'cross', text: 'ঘাটের তালা খুলে কুমির এড়িয়ে দিঘির দ্বীপে পৌঁছাও' },
      { id: 'dig', text: 'দ্বীপে খুঁড়ে রত্নখণ্ড বের করো' },
      { id: 'timeline', text: 'বোনাস: রিনা আপার ইতিহাসের সময়রেখা সাজাও', optional: true },
    ],
    historyCard: 'পনেরো শতকে খান জাহান আলী বাগেরহাটে খলিফাতাবাদ নামে একটি শহর গড়ে তোলেন, আর তখনই ষাট গম্বুজ মসজিদ নির্মিত হয়। নাম "ষাট গম্বুজ" হলেও ছাদে আছে ৭৭টি গম্বুজ (মাঝের সারির ৭টি চৌচালা), আর চার কোণের মিনারে আরও ৪টি। ভেতরে ৬০টি পাথরের স্তম্ভ। বাংলার বাঁকা কার্নিশ আর পোড়ামাটির কারুকাজ এর বিশেষত্ব। "মসজিদের শহর বাগেরহাট" ১৯৮৫ সালে ইউনেস্কো বিশ্ব ঐতিহ্যের তালিকায় স্থান পায়।',

    onStart(api) {
      api.say(lines('narrator',
        'বাগেরহাট। নারকেল গাছের সারি, বড় বড় দিঘি, আর লাল ইটের প্রাচীন মসজিদ। পনেরো শতকে এখানেই ছিল খান জাহান আলীর শহর **খলিফাতাবাদ**।',
        'সামনে ষাট গম্বুজ মসজিদ, বাংলার সবচেয়ে বড় প্রাচীন মসজিদগুলোর একটি। ছাদের দিকে তাকাও: সারি সারি গম্বুজ!',
        'ফটকের কাছে সাদা টুপি পরা খাদেম দাঁড়িয়ে আছেন।'));
    },

    update(api, dt) {
      const L = api.L, cs = L.flags.crocs;
      for (const c of cs) {
        c.x += c.v * c.dir * dt; c.t += dt;
        if (c.x > c.x1) { c.x = c.x1; c.dir = -1; }
        if (c.x < c.x0) { c.x = c.x0; c.dir = 1; }
        c.surf = (Math.sin(c.t * 0.9 + c.ph) + 1) / 2;
      }
      L.flags.hitCool -= dt;
      const p = L.player;
      if (L.busy) return;
      const onStone = L.at(p.x, p.y) === 's' || (p.to && L.at(p.to[0], p.to[1]) === 's');
      if (onStone && L.flags.hitCool <= 0) {
        const [px, py] = api.playerPos();
        for (const c of cs) {
          if (Math.hypot(c.x - px, c.y - py) < 0.8) {
            L.flags.hitCool = 1.2; L.flags.hits++;
            api.splash(px, py);
            api.teleport(27, 19);
            api.toast(L.flags.hits === 1 ? '🐊 কুমির তেড়ে এল! ঘাটে ফিরে এলে। কুমির <b>দূরে গেলে</b> পাথরে পা রাখো।' : '🐊 উফ! আবার কুমির। চোখ দুটো খেয়াল করো…');
            break;
          }
        }
      }
      if (!api.isDone('cross') && onIsland(p.x, p.y)) {
        api.complete('cross');
        Sound.sfx('right');
        api.floatText(p.x, p.y, 'দ্বীপে পৌঁছে গেছ!');
        api.toast('🏝 দ্বীপে পৌঁছে গেছ! এবার কম্পাস দেখে <b>ঠিক জায়গায়</b> খোঁড়ো।', 3500);
      }
    },

    drawWorld(ctx, api, T) {
      for (const c of api.L.flags.crocs) Art.croc(ctx, c.x * T + T / 2, c.y * T + T / 2, c.dir > 0 ? 0 : Math.PI, c.surf, c.t);
    },

    interact: {
      async khadem(api) {
        if (!api.isDone('talk')) {
          const c = await api.say([
            ...lines('khadem',
              'আসসালামু আলাইকুম! ষাট গম্বুজ মসজিদে স্বাগতম।',
              'পনেরো শতকে **খান জাহান আলী** এই অঞ্চলে শহর গড়েছিলেন, অনেক মসজিদ, দিঘি আর রাস্তা বানিয়েছিলেন। এই মসজিদ তাঁর সবচেয়ে বড় কীর্তি।'),
            ask('khadem', 'তা, কী মনে করে এলে?', ['গুপ্তধনের খোঁজে এসেছি, চাচা', 'নামটা "ষাট গম্বুজ" কেন?']),
          ]);
          await api.say(lines('khadem',
            c === 0 ? 'হুম, দিঘির মাঝের দ্বীপ নিয়ে একটা পুরনো গল্প আছে বটে। আগে এই **কম্পাসটা** রাখো, ধনের কাছে গেলে গরম হয়।'
              : 'লোকে নানা কথা বলে। কেউ বলে ভেতরের **ষাটটা পাথরের থামের** জন্য এই নাম। কেউ বলে অন্য কিছু। তবে গম্বুজ কিন্তু ষাটের বেশি! এই **কম্পাসটা** রাখো।',
            'দিঘির ঘাটের চাবি আমার কাছে। কিন্তু দেব একটা শর্তে: ছাদের দিকে ভালো করে তাকাও, **সবগুলো গম্বুজ গুনে** এসে বলো মোট কয়টা।',
            'আর খুঁড়তে হলে ঘোড়াদিঘির পাড়ে জেলের **কুঁড়েঘরে** কোদাল পাবে।'));
          api.give({ id: 'compass', icon: '🧭', name: 'পুরনো কম্পাস' });
          api.complete('talk');
          return;
        }
        if (!api.isDone('domes')) {
          const c = await api.say([ask('khadem', 'গম্বুজগুলো গুনেছ?', ['হ্যাঁ, বলছি!', 'এখনো গুনিনি'])]);
          if (c !== 0) { await api.say(lines('khadem', 'ছাদে সারি সারি গোল গম্বুজ। মাঝের সারির চারকোনা ছাদগুলোও (চৌচালা) গম্বুজ ধরে গুনবে। আর চার কোণের মিনারের মাথাও ভুলো না!')); return; }
          const ok = await api.lock({ code: '81', kicker: 'খাদেমের প্রশ্ন', title: 'মসজিদে মোট কয়টা গম্বুজ?', tryLabel: 'বলো',
            hint: 'ছাদের সব গম্বুজ (মাঝের সারির চৌচালাগুলোসহ) + চার কোণের মিনারের গম্বুজ। দরকার হলে বাইরে গিয়ে আবার গুনে এসো।',
            okMsg: 'একদম ঠিক!', wrongMsg: 'উঁহু, হয়নি। আরেকবার গুনে দেখো: সারি × কলাম, তারপর মিনার।' });
          if (!ok) return;
          api.complete('domes');
          api.give({ id: 'ghatKey', icon: '🗝', name: 'ঘাটের চাবি' });
          const tr = api.L.treasure;
          api.showCircle({ x: tr.x + Math.round((api.rand() - 0.5) * 2), y: tr.y, r: 2 });
          api.clue('দিঘির মাঝের <b>দ্বীপে</b> ধন। ঘাটের দরজা খুলে পাথরের পথ ধরো, <b>কুমির থেকে সাবধান</b>');
          await api.say(lines('khadem',
            'শাবাশ! ছাদে **৭ × ১১ = ৭৭টা**, আর চার মিনারে **৪টা**, মোট **৮১টা** গম্বুজ। অথচ নাম ষাট গম্বুজ!',
            'এই নাও **ঘাটের চাবি**। মাজারের দিঘির মাঝের দ্বীপে নাকি খান জাহানের আমলের কিছু লুকানো আছে।',
            'কিন্তু সাবধান! ওই দিঘিতে **কুমির** থাকে। পাথরে পা রাখার আগে দেখে নিয়ো কুমির কোথায়।'));
          return;
        }
        await api.say(lines('khadem', api.isDone('cross') ? 'দ্বীপে পৌঁছেছ! এবার কম্পাস দেখে খোঁড়ো।' : 'কুমিরের চোখ দেখলেই বুঝবে কোথায় আছে। ও দূরে গেলে তবেই পাথরে পা দিয়ো।'));
      },

      async mosque(api) {
        await api.say(lines('narrator',
          'বিশাল প্রার্থনাকক্ষ। ভেতরে সারি সারি **ষাটটা পাথরের থাম** ছাদের ভার ধরে রেখেছে। দেয়ালগুলো খুব পুরু, তাই ভেতরটা গরমেও ঠান্ডা থাকে।',
          'পূর্ব দিকে এগারোটা খিলানওয়ালা দরজা। বাইরের দেয়ালে পোড়ামাটির ফুল-লতার নকশা। ছাদের কিনারা বাংলার কুঁড়েঘরের চালের মতো বাঁকানো।'));
      },

      async mazar(api) {
        await api.say(lines('narrator',
          'খান জাহান আলীর মাজার। চারকোনা দালানের উপর একটা গম্বুজ। দূর-দূরান্ত থেকে মানুষ আসে।',
          'সামনের দিঘিতে বহু বছর ধরে কুমির আছে। লোকমুখে সবচেয়ে বিখ্যাত দুটোর নাম ছিল **কালাপাহাড়** আর **ধলাপাহাড়**।'));
      },

      async hut(api) {
        if (api.has('shovel')) { await api.say(lines('narrator', 'জেলের কুঁড়েঘরে জাল, পলো আর মাছ ধরার চাঁই। আর কিছু নেই।')); return; }
        await api.say(lines('narrator', 'জেলের কুঁড়েঘর। দরজায় শুকাতে দেওয়া জাল, আর কোণে একটা **কোদাল**।'));
        api.give({ id: 'shovel', icon: '⛏', name: 'কোদাল' });
        api.complete('shovel');
      },

      async ghat(api) {
        if (!api.has('ghatKey')) { await api.say(lines('narrator', 'দিঘির ঘাটে নামার কাঠের দরজায় তালা। খাদেমের কাছে চাবি আছে।')); return; }
        api.openDoor('ghat');
        api.take('ghatKey');
        await api.say(lines('narrator', 'দরজা খুলে গেল। সামনে পানিতে সারি সারি পাথর, দ্বীপ পর্যন্ত। পানির উপর দুই জোড়া হলুদ **চোখ** ভাসছে…'));
        api.toast('🐊 কুমির যখন দূরে, তখন পাথরে পা রাখো। ধাক্কা খেলে ঘাটে ফিরে আসবে।', 4500);
      },

      async teacher(api) {
        if (api.isDone('timeline')) { await api.say(lines('teacher', 'তোমার মতো ইতিহাস-প্রেমী পেলে ছাত্রছাত্রীরা খুব খুশি হয়! শুভকামনা।')); return; }
        const c = await api.say([
          ...lines('teacher',
            'হ্যালো! আমি রিনা আপা, স্কুলের শিক্ষক। ছাত্রছাত্রীদের নিয়ে শিক্ষাসফরে এসেছি।',
            'ওদের একটা খেলা দিয়েছিলাম: দেশের ঐতিহাসিক জায়গাগুলো **সবচেয়ে পুরনো থেকে নতুন** ক্রমে সাজাতে। ওরা গুলিয়ে ফেলেছে!'),
          ask('teacher', 'তুমি একটু সাজিয়ে দেখাবে?', ['অবশ্যই, দিন!', 'যুগগুলোর ক্রমটা একটু বলবেন?']),
        ]);
        if (c === 1) await api.say(lines('teacher', 'সবচেয়ে পুরনো **মৌর্য যুগ**, তারপর **দেব-পাল** আমলের বৌদ্ধ যুগ, তারপর **সুলতানি**, তারপর **মুঘল**, আর সবশেষে **ঔপনিবেশিক** আমল।'));
        const ok = await api.order({
          kicker: 'রিনা আপার খেলা', title: 'পুরনো থেকে নতুন: সময়রেখা সাজাও',
          hint: '▲ ▼ চেপে কার্ডগুলো সরাও। সবচেয়ে পুরনোটা থাকবে সবার উপরে।',
          items: [
            { label: 'মহাস্থানগড়', sub: 'মৌর্য যুগের পুণ্ড্রনগর' },
            { label: 'শালবন বিহার', sub: 'দেব রাজাদের বৌদ্ধ বিহার' },
            { label: 'ষাট গম্বুজ মসজিদ', sub: 'সুলতানি আমল, খান জাহান আলী' },
            { label: 'লালবাগ কেল্লা', sub: 'মুঘল আমল, শাহজাদা আজম' },
            { label: 'পানাম নগর', sub: 'ঔপনিবেশিক আমলের বণিকপাড়া' },
          ],
        });
        if (!ok) return;
        api.complete('timeline');
        api.flag('sightBonus', 1.6);
        api.give({ id: 'lantern', icon: '🔭', name: 'দূরবীন' });
        api.addDigs(1);
        await api.say(lines('teacher', 'চমৎকার! এই নাও আমার পুরনো **দূরবীন**, দূরের জিনিস ভালো দেখা যাবে। আর এই বাড়তি কোদালের ফলায় **একবার** বেশি খুঁড়তে পারবে।'));
      },
    },
  };
})();
