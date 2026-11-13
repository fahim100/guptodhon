// লেভেল ৩: ময়নামতি — শালবন বিহার, প্রাচীন সংখ্যা-লিপির রহস্য
// টাইল: g ঘাস · l লাল মাটি · m প্রাচীন ইটের মেঝে · n ভিক্ষুকক্ষের মেঝে · r ভাঙা দেয়াল · f বুনো ফুল · w পুকুর
(function () {
  const C = 36, R = 30;
  const V = { x0: 8, y0: 8, x1: 26, y1: 26 }; // বিহারের বাইরের দেয়াল

  // প্রাচীন সংখ্যা-চিহ্ন (ব্রাহ্মী লিপির আদলে বানানো, আসল নয়)
  const GLYPHS = [
    'M5 16 L19 16',
    'M5 11 L19 11 M5 21 L19 21',
    'M5 7 L19 7 M5 16 L19 16 M5 25 L19 25',
    'M6 5 L6 27 L19 27',
    'M12 5 L5 27 M12 5 L19 27 M8 19 L16 19',
    'M5 27 L12 6 L19 27 M12 6 L12 27',
    'M12 5 A7 7 0 1 0 12.1 5 M12 12 L12 27',
    'M5 7 Q19 7 12 16 Q5 25 19 25',
    'M6 6 L18 26 M18 6 L6 26',
    'M12 27 L12 6 M5 13 L12 6 L19 13',
  ];
  const glyph = (i) => `<svg class="glyph" viewBox="0 0 24 32"><path d="${GLYPHS[i]}"/></svg>`;

  const LOOKS = {
    nasrin: { skin: '#b07a52', top: '#8a9a5a', bottom: '#4a4a52', hat: 'safari', glasses: true, hair: '#1e140c', phase: 0.5 },
    monk: { skin: '#a8704a', top: '#d9822b', bottom: '#c9701f', robe: true, phase: 3 },
  };

  const QUIZ = [
    { question: 'শালবন বিহার কে নির্মাণ করেছিলেন বলে মনে করা হয়?', options: ['পাল রাজা ধর্মপাল', 'দেব বংশের রাজা ভবদেব', 'ঈসা খাঁ', 'শাহজাদা আজম'], answer: 1 },
    { question: 'শালবন বিহারের কক্ষগুলোতে কারা থাকতেন?', options: ['মুঘল সৈন্যরা', 'বণিকেরা', 'বৌদ্ধ ভিক্ষুরা', 'জমিদারেরা'], answer: 2 },
    { question: 'শালবন বিহার কোন জেলায়?', options: ['নওগাঁ', 'বগুড়া', 'দিনাজপুর', 'কুমিল্লা'], answer: 3 },
    { question: 'শালবন বিহারে ভিক্ষুদের কক্ষ কয়টি?', options: ['১১৫টি', '৬০টি', '৮১টি', '১৭৭টি'], answer: 0 },
  ];

  function build() {
    const g = [];
    for (let y = 0; y < R; y++) g.push(new Array(C).fill('g'));
    const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < C && y < R) g[y][x] = t; };
    const rect = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, t); };

    // লাল মাটির পথ
    rect(1, 4, 17, 4, 'l'); rect(17, 4, 17, 7, 'l'); rect(17, 5, 30, 5, 'l'); rect(30, 5, 30, 17, 'l');
    rect(3, 3, 15, 6, 'l'); // খনন-শিবির
    // বুনো ফুল আর পুকুর
    for (const [x, y] of [[4, 9], [3, 20], [29, 24], [32, 9]]) rect(x, y, x + 1, y + 1, 'f');
    rect(30, 21, 32, 22, 'w');

    // বিহার: বাইরের দেয়াল, কক্ষের সারি, ভেতরের দেয়াল
    rect(V.x0, V.y0, V.x1, V.y1, 'r');
    rect(V.x0 + 1, V.y0 + 1, V.x1 - 1, V.y1 - 1, 'r');
    rect(V.x0 + 3, V.y0 + 3, V.x1 - 3, V.y1 - 3, 'm'); // ভেতরের বারান্দা
    rect(V.x0 + 4, V.y0 + 4, V.x1 - 4, V.y1 - 4, 'g'); // উঠান
    // উঠানের পথ
    rect(17, V.y0 + 4, 17, 14, 'm'); rect(15, 20, 19, 20, 'm'); rect(13, 17, 14, 17, 'm'); rect(20, 17, 21, 17, 'm');

    // কক্ষ: ঘড়ির কাঁটার দিকে, ফটকের পূর্ব পাশ থেকে নম্বর
    const sides = [];
    const north = [], east = [], south = [], west = [];
    for (let i = 0; i <= 14; i++) {
      north.push({ x: V.x0 + 2 + i, y: V.y0 + 1, door: [V.x0 + 2 + i, V.y0 + 2], i });
      east.push({ x: V.x1 - 1, y: V.y0 + 2 + i, door: [V.x1 - 2, V.y0 + 2 + i], i });
      south.push({ x: V.x1 - 2 - i, y: V.y1 - 1, door: [V.x1 - 2 - i, V.y1 - 2], i });
      west.push({ x: V.x0 + 1, y: V.y1 - 2 - i, door: [V.x0 + 2, V.y1 - 2 - i], i });
    }
    sides.push(north.slice(8), east, south, west, north.slice(0, 7));
    const cells = [];
    for (const side of sides) for (const c of side) if (c.i % 2 === 1 && !(c.y === V.y0 + 1 && c.x >= 16 && c.x <= 18)) cells.push(c);
    cells.forEach((c, k) => { c.n = k + 1; set(c.x, c.y, 'n'); set(c.door[0], c.door[1], 'm'); });
    // উত্তরের প্রধান ফটক
    rect(16, V.y0, 18, V.y0 + 2, 'm');

    const objects = [];
    const add = (o) => objects.push(o);
    add({ id: 'shrine', kind: 'building', style: 'shrine', variant: 3, x: 15, y: 15, w: 5, h: 5, door: { x: 17, y: 14 }, interact: true, prompt: 'মন্দির দেখো',
      bubble: (api) => api.isDone('talk') && !api.isDone('memory') });
    add({ id: 'tent', kind: 'prop', x: 3, y: 1, w: 3, h: 2, interact: true, prompt: 'তাঁবুতে ঢোকো', door: { x: 4, y: 3 },
      draw: (ctx, t, T, o) => Art.tent(ctx, o.x * T, o.y * T, t), bubble: (api) => api.isDone('talk') && !api.has('shovel') });
    add({ id: 'trench', kind: 'prop', x: 9, y: 1, w: 4, h: 2, draw: (ctx, t, T, o) => Art.trench(ctx, o.x * T, o.y * T, o.w * T, o.h * T) });
    add({ id: 'table', kind: 'prop', x: 14, y: 2, w: 2, h: 1, interact: true, prompt: 'খুঁজে পাওয়া জিনিস দেখো', optional: true, door: { x: 14, y: 3 },
      draw: (ctx, t, T, o) => Art.findsTable(ctx, o.x * T, o.y * T - 6), bubble: (api) => api.isDone('talk') && !api.isDone('seal') });
    add({ id: 'nasrin', kind: 'npc', look: LOOKS.nasrin, x: 8, y: 5, interact: true, prompt: 'কথা বলো', bubble: (api) => !api.isDone('talk') });
    add({ id: 'monk', kind: 'npc', look: LOOKS.monk, x: 30, y: 18, interact: true, prompt: 'প্রণাম জানাও', bubble: (api) => api.isDone('talk') && !api.isDone('key') });
    for (const c of cells) add({ id: `cm${c.n}`, kind: 'decor', flat: true, x: c.door[0], y: c.door[1], w: 1, h: 1, draw: (ctx, t, T, o) => Art.cellMark(ctx, o.x * T + T / 2, o.y * T + T * 0.82, BN_DIGITS(c.n)) });

    // শালবন: চারপাশে ঘন শালগাছ
    const free = (x, y) => (g[y][x] === 'g' || g[y][x] === 'f') && !objects.some((o) => x >= o.x && x < o.x + (o.w || 1) && y >= o.y - 1 && y < o.y + (o.h || 1) + 1);
    const tree = (x, y, style) => { if (free(x, y)) add({ id: `t${x}_${y}`, kind: 'tree', style, x, y }); };
    for (let x = 0; x < C; x++) { tree(x, 0, 'sal'); tree(x, R - 1, 'sal'); if (x % 2) tree(x, R - 2, 'sal'); }
    for (let y = 0; y < R; y++) { tree(0, y, 'sal'); tree(C - 1, y, 'sal'); if (y % 2) { tree(1, y, 'sal'); tree(C - 2, y, 'sal'); } }
    for (const [x, y] of [[5, 12], [3, 15], [6, 24], [4, 27], [12, 28], [21, 28], [33, 13], [33, 27], [28, 8], [20, 2], [24, 3], [31, 2], [6, 18], [29, 12], [32, 19], [27, 27]]) tree(x, y, 'sal');
    tree(31, 17, 'round'); // ভিক্ষুর ছায়াগাছ
    for (const [x, y] of [[13, 13], [21, 13], [13, 21], [21, 21]]) tree(x, y, 'light');

    const flocks = [{ x: 14, y: 21.2, w: 6, h: 1.2, n: 5 }, { x: 18, y: 4.2, w: 8, h: 1.2, n: 4 }];
    return { cols: C, rows: R, tiles: g.map((r) => r.join('')), objects, flocks, cells, start: { x: 1, y: 4 } };
  }

  function setup(L, api) {
    const cells = L.m.cells;
    const pick = (a) => a[(Math.random() * a.length) | 0];
    const target = pick(cells);
    L.treasure = { x: target.x, y: target.y };
    L.flags.cell = target.n;
    // সংখ্যা → চিহ্ন: প্রতিবার এলোমেলো
    const perm = [...Array(10).keys()].sort(() => Math.random() - 0.5);
    L.flags.perm = perm;
    // মুদ্রা: একটা অন্য কক্ষে, একটা উঠানে, একটা বাইরে
    const grass = (test) => { const c = []; for (let y = 2; y < L.R - 2; y++) for (let x = 2; x < L.C - 2; x++) if (L.at(x, y) === 'g' && !L.solid[y * L.C + x] && test(x, y)) c.push({ x, y }); return c; };
    const other = pick(cells.filter((c) => c !== target));
    const spots = [other, pick(grass((x, y) => x > 12 && x < 22 && y > 12 && y < 22 && (x < 15 || x > 19 || y < 15 || y > 19))), pick(grass((x, y) => x > 27 && y > 6))];
    spots.forEach((p, i) => L.objects.push({ id: `coin${i}`, kind: 'coin', x: p.x, y: p.y, w: 1, h: 1, solid: false }));
  }

  const lines = (who, ...texts) => texts.map((text) => ({ who, text }));
  const ask = (who, text, choices) => ({ who, text, choices });
  const bn = (n) => BN_DIGITS(n);

  function plateView(L) {
    const n = L.flags.cell, d = [Math.floor(n / 10), n % 10];
    return {
      kicker: 'তাম্রলিপি', title: 'তামার পাতে প্রাচীন হরফ',
      html: `<div class="plate">${d.map((x) => glyph(L.flags.perm[x])).join('')}</div>
        <p>পাতের উপরে লেখা: "রত্ন ঘুমায় এই নম্বরের <b>ভিক্ষুকক্ষে</b>।" চিহ্নগুলো প্রাচীন সংখ্যা। কোন চিহ্ন কোন অঙ্ক, তা জানতে <b>সংখ্যা-লিপির পাঠ</b> লাগবে।</p>
        <p>প্রতিটা কক্ষের দরজায় নম্বর-পাথর আছে।</p>`,
    };
  }
  function keyView(L) {
    const cellsHtml = [...Array(10).keys()].map((d) => `<div>${glyph(L.flags.perm[d])}<b>${bn(d)}</b></div>`).join('');
    return {
      kicker: 'তালপাতার পুঁথি', title: 'প্রাচীন সংখ্যা-লিপির পাঠ',
      html: `<div class="glyph-key">${cellsHtml}</div><p>প্রতিটা চিহ্নের নিচে আজকের বাংলা অঙ্ক। তাম্রলিপির চিহ্ন দুটো মিলিয়ে কক্ষের নম্বর বের করো (প্রথমটা দশক, দ্বিতীয়টা একক)।</p>`,
    };
  }

  window.LEVELS.mainamati = {
    digs: 5,
    build,
    setup,
    diggable: ['n'],
    digHint: 'এখানে খোঁড়া যাবে না। খনন করতে হবে <b>ভিক্ষুকক্ষের ভেতরে</b> দাঁড়িয়ে।',
    coinName: 'প্রাচীন রুপার মুদ্রা',
    speakers: {
      nasrin: { name: 'ড. নাসরিন, প্রত্নতত্ত্ববিদ', face: '👩🏽‍🔬' },
      monk: { name: 'ভিক্ষু শীলভদ্র', face: '🧘🏽' },
    },
    objectives: [
      { id: 'talk', text: 'খনন-শিবিরে ড. নাসরিনের সাথে কথা বলো' },
      { id: 'shovel', text: 'তাঁবু থেকে খননের খুরপি নাও' },
      { id: 'memory', text: 'কেন্দ্রীয় মন্দিরের পোড়ামাটির ফলকের জোড়া মেলাও' },
      { id: 'key', text: 'ভিক্ষুর কাছ থেকে প্রাচীন সংখ্যা-লিপির পাঠ নাও' },
      { id: 'dig', text: 'তাম্রলিপির সংখ্যা পড়ে ঠিক কক্ষে খুঁড়ে রত্নখণ্ড বের করো' },
      { id: 'seal', text: 'বোনাস: ভাঙা পোড়ামাটির সিলমোহর জোড়া লাগাও', optional: true },
    ],
    historyCard: 'শালবন বিহার কুমিল্লার লালমাই-ময়নামতি পাহাড়ে অবস্থিত একটি প্রাচীন বৌদ্ধ বিহার। আট শতকে দেব বংশের রাজা ভবদেব এটি নির্মাণ করেন বলে ধারণা করা হয়। চৌকো বিহারের চারদিকে ভিক্ষুদের ১১৫টি কক্ষ, মাঝখানে ক্রুশাকৃতির কেন্দ্রীয় মন্দির, আর উত্তর দিকে একটিমাত্র প্রবেশপথ। খননে এখানে তাম্রলিপি, পোড়ামাটির ফলক, সিলমোহর আর সোনা-রুপার মুদ্রা পাওয়া গেছে, যার অনেকগুলো কাছের ময়নামতি জাদুঘরে রাখা আছে।',

    onStart(api) {
      api.say(lines('narrator',
        'কুমিল্লা, লালমাই পাহাড়। শালবনের ছায়ায় লাল মাটির পথ ধরে তুমি পৌঁছালে শালবন বিহারের ধ্বংসাবশেষে।',
        'এক হাজার বছরেরও বেশি আগে এখানে বৌদ্ধ ভিক্ষুরা থাকতেন, পড়তেন, ধ্যান করতেন। এখন শুধু লাল ইটের দেয়াল আর নীরবতা।',
        'বিহারের উত্তরে একটা খনন-শিবির। সেখানে প্রত্নতত্ত্ববিদেরা কাজ করছেন।'));
    },

    interact: {
      async nasrin(api) {
        if (!api.isDone('talk')) {
          const c = await api.say([
            ...lines('nasrin',
              'স্বাগতম! আমি ড. নাসরিন, প্রত্নতত্ত্ববিদ। আমরা শালবন বিহারে খননের কাজ করছি।',
              'আট শতকে দেব বংশের রাজা **ভবদেব** এই বিহার তৈরি করেছিলেন বলে আমরা মনে করি। চারদিকে ভিক্ষুদের **১১৫টা কক্ষ**, মাঝখানে **কেন্দ্রীয় মন্দির**।'),
            ask('nasrin', 'তুমি কি দেখতে এসেছ, নাকি অন্য কিছু?', ['আমি হারানো রত্নখণ্ড খুঁজছি', 'এখানে কারা থাকতেন?']),
          ]);
          await api.say(lines('nasrin',
            c === 0 ? 'রত্নখণ্ড! মজার ব্যাপার, মন্দিরের পোড়ামাটির ফলকের নিচে একটা **তাম্রলিপির** কথা শুনেছি। তাতে নাকি কোনো কক্ষের নম্বর লেখা।'
              : 'বৌদ্ধ **ভিক্ষুরা**। এটা ছিল শিক্ষা আর ধ্যানের কেন্দ্র। প্রতিটা ছোট কক্ষে একজন-দুজন ভিক্ষু থাকতেন। আর শুনেছি এখানে এক হারানো রত্নখণ্ডও লুকানো!',
            'এই **কম্পাসটা** নাও। আর মনে রেখো, প্রত্নস্থলে যেখানে-সেখানে খোঁড়া মানা। খুঁড়বে শুধু **সঠিক কক্ষের ভেতরে**।',
            'তাম্রলিপির হরফ খুব প্রাচীন। পূর্ব দিকের গাছতলায় ধ্যানরত **ভিক্ষু শীলভদ্র** ওই হরফ পড়তে জানেন। খুরপি লাগলে **তাঁবু** থেকে নিয়ো।'));
          api.give({ id: 'compass', icon: '🧭', name: 'পুরনো কম্পাস' });
          api.complete('talk');
          return;
        }
        const hint = !api.has('shovel') ? 'আগে তাঁবু থেকে খুরপিটা নাও।'
          : !api.isDone('memory') ? 'কেন্দ্রীয় মন্দিরে যাও। উত্তরের ফটক দিয়ে ঢুকে সোজা দক্ষিণে।'
          : !api.isDone('key') ? 'ভিক্ষু শীলভদ্র পূর্ব দিকের গাছতলায় বসে আছেন। ওঁর কাছে সংখ্যা-লিপির পাঠ আছে।'
          : 'তাম্রলিপি আর পাঠ মিলিয়ে নম্বর বের করো, তারপর সেই নম্বরের কক্ষে ঢুকে খোঁড়ো। থলেতে ক্লিক করলে আবার দেখা যাবে।';
        const MENU = ['এখন কী করব?', 'খননে কী কী পাওয়া গেছে?', 'আচ্ছা, আসি'];
        let c = await api.say([ask('nasrin', 'আর কিছু?', MENU)]);
        while (c !== 2 && c !== undefined) {
          const answer = [[hint], [
            '**তাম্রলিপি**, মানে তামার পাতে লেখা রাজার দলিল। আর অনেক **পোড়ামাটির ফলক**: হাতি, ঘোড়া, বানর, নানা মানুষের ছবি।',
            'আর পাওয়া গেছে সিলমোহর, সোনা-রুপার মুদ্রা। সবই কাছের **ময়নামতি জাদুঘরে** আছে। দেখতে ভুলো না!']][c];
          c = await api.say([...lines('nasrin', ...answer), ask('nasrin', 'আর কিছু?', MENU)]);
        }
      },

      async tent(api) {
        if (api.has('shovel')) { await api.say(lines('narrator', 'তাঁবুতে মাপার ফিতা, খাতা আর লেবেল লাগানো থলে। সব সাজানো-গোছানো।')); return; }
        await api.say(lines('narrator', 'তাঁবুর ভেতরে খননের সরঞ্জাম। একটা **খুরপি** আর নরম **তুলি** তুলে নিলে।'));
        api.give({ id: 'shovel', icon: '⛏', name: 'খুরপি আর তুলি' });
        api.complete('shovel');
        api.toast('⛏ খুরপি পেয়েছ! খুঁড়তে হবে শুধু <b>ভিক্ষুকক্ষের ভেতরে</b>।', 3500);
      },

      async shrine(api) {
        if (api.isDone('memory')) { await api.say(lines('narrator', 'মন্দিরের দেয়ালে পোড়ামাটির ফলকের সারি। হাতি, ঘোড়া, ময়ূর… হাজার বছর পরেও স্পষ্ট।')); return; }
        await api.say(lines('narrator',
          'ক্রুশাকৃতির কেন্দ্রীয় মন্দির, ধাপে ধাপে উঁচু। চারপাশের দেয়ালে সারি সারি **পোড়ামাটির ফলক**।',
          'কয়েকটা ফলক আলগা হয়ে উল্টে পড়ে আছে। ঠিক জোড়াগুলো মেলালে হয়তো নিচের গোপন খোপটা খুলবে…'));
        const ok = await api.memory({
          kicker: 'পোড়ামাটির ফলক', title: 'একই ছবির জোড়া খোঁজো',
          hint: 'দুটো করে ফলক উল্টাও। একই ছবি হলে জোড়া মিলবে। কম চালে শেষ করার চেষ্টা করো!',
          faces: ['🐘', '🐎', '🦁', '🐒', '🦢', '🦚'], pairs: 6,
        });
        if (!ok) { await api.say(lines('narrator', 'ফলকগুলো আবার উল্টে গেল। পরে চেষ্টা করা যাবে।')); return; }
        api.complete('memory');
        const L = api.L;
        api.give({ id: 'plate', icon: '📜', name: 'তাম্রলিপি', view: plateView(L) });
        await api.say(lines('narrator', 'শেষ জোড়াটা মিলতেই একটা ইট সরে গেল। ভেতরে সবুজ ছোপ ধরা একটা **তাম্রলিপি**!'));
        await api.view(plateView(L));
        api.clue('তাম্রলিপিতে প্রাচীন চিহ্নে <b>কক্ষের নম্বর</b> লেখা (থলেতে 📜 ক্লিক করে দেখো)');
      },

      async monk(api) {
        if (api.isDone('key')) { await api.say(lines('monk', 'চিহ্নগুলো মিলিয়ে নিন। ধৈর্যই আসল পাঠ। মঙ্গল হোক।')); return; }
        await api.say(lines('monk',
          'আসুন, এই গাছের ছায়ায় একটু বসুন। আমি শীলভদ্র, তীর্থ করতে এসেছি।',
          'হাজার বছর আগে আমাদের মতো ভিক্ষুরা এই বিহারে থাকতেন। এখানে ছিল পাঠশালা, ধ্যানের ঘর, আর জ্ঞানের চর্চা।',
          'প্রাচীন সংখ্যা-লিপির পাঠ আমার কাছে আছে। তবে আগে দেখি, এই জায়গাকে আপনি কতটা চিনেছেন।'));
        if (api.flag('quizIdx') === undefined) api.flag('quizIdx', (api.rand() * QUIZ.length) | 0);
        const ok = await api.quiz(Object.assign({ kicker: 'ভিক্ষুর প্রশ্ন' }, QUIZ[api.flag('quizIdx')]));
        if (!ok) { await api.say(lines('monk', 'তাড়াহুড়ো নেই। ড. নাসরিনের কথাগুলো মনে করে আবার আসুন।')); return; }
        api.complete('key');
        const L = api.L;
        api.give({ id: 'key', icon: '🍃', name: 'সংখ্যা-লিপির পাঠ', view: keyView(L) });
        await api.say(lines('monk', 'ঠিক বলেছেন। এই তালপাতার পুঁথিতে প্রাচীন সংখ্যার চিহ্ন আর আজকের অঙ্ক পাশাপাশি লেখা। নিন।'));
        await api.view(keyView(L));
        api.clue('তালপাতার পুঁথিতে <b>চিহ্ন → অঙ্ক</b> (থলেতে 🍃 ক্লিক করে দেখো)');
      },

      async table(api) {
        if (api.isDone('seal')) { await api.say(lines('narrator', 'জোড়া লাগানো সিলমোহরটা টেবিলে রাখা। ধর্মচক্র আর দুই পাশে দুটো হরিণ।')); return; }
        const c = await api.say([
          ...lines('narrator', 'টেবিলে লেবেল লাগানো পোড়ামাটির টুকরো, মুদ্রা আর একটা ভাঙা **সিলমোহর**। টুকরোগুলো এলোমেলো।'),
          ask('narrator', 'সিলমোহরটা জোড়া লাগাবে?', ['হ্যাঁ, চেষ্টা করি', 'এখন না']),
        ]);
        if (c !== 0) return;
        const ok = await api.tiles({ image: 'seal', kicker: 'খনন-শিবির', title: 'সিলমোহর জোড়া লাগাও', hint: 'টুকরোয় ক্লিক করলে ৯০° ঘোরে। মাঝের ধর্মচক্র ঠিক আছে। হরিণ, লেখা আর কিনারা মিলিয়ে দাও।' });
        if (!ok) return;
        api.complete('seal');
        api.flag('sightBonus', 1.6);
        api.give({ id: 'lantern', icon: '🔦', name: 'টর্চ' });
        api.addDigs(1);
        await api.say(lines('nasrin', 'বাহ, চমৎকার! এই সিলমোহর জাদুঘরে যাবে। ধন্যবাদ হিসেবে আমার **টর্চটা** রাখো, আর এই বাড়তি খুরপির ফলাটাও। **একবার** বেশি খুঁড়তে পারবে।'));
      },
    },
  };
})();
