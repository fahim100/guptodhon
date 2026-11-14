// লেভেল ৬: মহাস্থানগড় — পুণ্ড্রনগরের প্রাচীর, শিলালিপি আর পাথর ঠেলার ধাঁধা
// টাইল: g ঘাস · l লাল মাটির পথ · r প্রাচীর/ভাঙা দেয়াল · m প্রাচীন ইটের মেঝে · q খোদাই করা চিহ্ন · k করতোয়া নদী
(function () {
  const C = 40, R = 30;
  const GRANARY = { x0: 19, y0: 19, x1: 25, y1: 23 };
  const PLATES = [[10, 17], [14, 20], [10, 20]];
  const BLOCKS = [[11, 17], [14, 18], [11, 19]];

  const LOOKS = {
    guide: { skin: '#a8704a', top: '#2f6b8a', bottom: '#3a3a44', hair: '#1e140c', phase: 0.8 },
    nani: { skin: '#9c6b4a', top: '#f2efe6', bottom: '#f2efe6', border: '#2a7a4a', saree: true, veil: true, hair: '#d8d8d8', phase: 1.7 },
  };

  const RIDDLES = [
    { question: '"বন থেকে বেরোল টিয়ে, সোনার টোপর মাথায় দিয়ে।" বলো তো কী?', options: ['আম', 'আনারস', 'কাঁঠাল', 'টিয়াপাখি'], answer: 1 },
    { question: '"এক থালা সুপারি, গুনতে না পারি।" বলো তো কী?', options: ['আকাশের তারা', 'ধানের খেত', 'নদীর ঢেউ', 'গাছের পাতা'], answer: 0 },
    { question: '"চার পায়ে দাঁড়িয়ে থাকে, হাঁটতে পারে না; সবাইকে বসতে দেয়, নিজে বসে না।" বলো তো কী?', options: ['গরু', 'ঘোড়া', 'চেয়ার', 'পালকি'], answer: 2 },
  ];

  function build() {
    const g = [];
    for (let y = 0; y < R; y++) g.push(new Array(C).fill('g'));
    const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < C && y < R) g[y][x] = t; };
    const rect = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, t); };
    const box = (x0, y0, x1, y1, t) => { rect(x0, y0, x1, y0, t); rect(x0, y1, x1, y1, t); rect(x0, y0, x0, y1, t); rect(x1, y0, x1, y1, t); };

    rect(C - 5, 0, C - 1, R - 1, 'k'); // করতোয়া
    // নগর-প্রাচীর (দুই সারি পুরু), পূর্ব আর উত্তরের ফটক
    rect(5, 3, 29, 26, 'r'); rect(7, 5, 27, 24, 'g');
    rect(28, 13, 29, 15, 'm'); rect(16, 3, 18, 4, 'm');
    rect(30, 14, C - 6, 14, 'l'); rect(30, 15, 30, 23, 'l'); rect(30, 23, 32, 23, 'l'); // ঘাট থেকে ফটক, আর কৃষকের ঘরের পথ
    rect(17, 5, 17, 12, 'l'); rect(8, 13, 27, 13, 'l'); // নগরের ভেতরের পথ
    // পরশুরামের প্রাসাদের ধ্বংসাবশেষ
    rect(19, 6, 25, 10, 'm'); box(19, 6, 25, 10, 'r'); rect(22, 10, 22, 10, 'm'); rect(19, 8, 19, 8, 'm'); rect(25, 7, 25, 7, 'm');
    // খোদার পাথর ভিটা: পাথর ঠেলার চত্বর
    box(8, 15, 16, 22, 'r'); rect(9, 16, 15, 21, 'm'); set(16, 18, 'm'); set(12, 20, 'r');
    for (const [x, y] of PLATES) set(x, y, 'q');
    // শস্যভাণ্ডার
    box(GRANARY.x0 - 1, GRANARY.y0 - 1, GRANARY.x1 + 1, GRANARY.y1 + 1, 'r');
    set(22, GRANARY.y0 - 1, 'm'); // দরজার নিচে মেঝে, যাতে খুললে পথ হয়
    // ফুল
    for (const [x, y] of [[9, 6], [25, 16], [31, 4], [33, 25]]) rect(x, y, x + 1, y + 1, 'f');

    const objects = [];
    const add = (o) => objects.push(o);
    add({ id: 'guide', kind: 'npc', look: LOOKS.guide, x: 26, y: 12, interact: true, prompt: 'কথা বলো', bubble: (api) => !api.isDone('talk') });
    add({ id: 'plaque', kind: 'stele', x: 24, y: 12, interact: true, prompt: 'শিলালিপি দেখো', bubble: (api) => api.isDone('talk') && !api.isDone('slide') });
    add({ id: 'palace', kind: 'stele', x: 22, y: 11, interact: true, prompt: 'ফলক পড়ো' });
    add({ id: 'well', kind: 'prop', x: 11, y: 8, interact: true, prompt: 'কূপ দেখো', draw: (ctx, t, T, o) => Art.well(ctx, o.x * T, o.y * T, t) });
    add({ id: 'nani', kind: 'npc', look: LOOKS.nani, x: 13, y: 8, interact: true, prompt: 'কথা বলো', optional: true, bubble: (api) => !api.isDone('riddles') });
    add({ id: 'hut', kind: 'building', style: 'hut', x: 31, y: 19, w: 3, h: 3, door: { x: 32, y: 22 }, interact: true, prompt: 'কৃষকের ঘর',
      bubble: (api) => api.isDone('talk') && !api.has('shovel') });
    add({ id: 'slab', kind: 'prop', x: 12, y: 18, interact: true, prompt: 'খোদার পাথর', draw: (ctx, t, T, o) => Art.bigSlab(ctx, o.x * T, o.y * T),
      bubble: (api) => api.isDone('slide') && !api.isDone('push') });
    add({ id: 'granaryDoor', kind: 'door', x: 22, y: GRANARY.y0 - 1, interact: true, prompt: 'পাথরের দরজা', door: { x: 22, y: GRANARY.y0 - 2 },
      draw: (ctx, t, T, o) => Art.stoneDoor(ctx, o.x * T, o.y * T, o.open, t) });
    BLOCKS.forEach(([x, y], i) => add({
      id: `block${i}`, kind: 'block', push: true, x, y, home: [x, y], interact: true, prompt: 'ঠেলো',
      draw: (ctx, t, T, o) => {
        const k = o.k === undefined ? 1 : o.k, fx = o.from ? o.from[0] : o.x, fy = o.from ? o.from[1] : o.y;
        const ease = 1 - Math.pow(1 - k, 2);
        Art.stoneBlock(ctx, (fx + (o.x - fx) * ease) * T, (fy + (o.y - fy) * ease) * T, api_at(o.x, o.y) === 'q');
      },
    }));
    const boat = (id, x, y, len) => add({ id, kind: 'decor', x, y, w: 1, h: 1, water: true, draw: (ctx, t, T, o) => Art.boat(ctx, o.x * T, o.y * T, t + o.x, len) });
    boat('boat1', 36.5, 15.5, 100); boat('boat2', 37.5, 4, 80);

    // গাছ
    const free = (x, y) => (g[y][x] === 'g' || g[y][x] === 'f') && !objects.some((o) => x >= Math.floor(o.x) && x < o.x + (o.w || 1) && y >= o.y - 1 && y < o.y + (o.h || 1) + 1);
    const tree = (x, y, style) => { if (free(x, y)) add({ id: `t${x}_${y}`, kind: 'tree', style, x, y }); };
    for (let x = 0; x < C - 5; x++) { tree(x, 0, x % 3 ? 'round' : 'light'); tree(x, R - 1, x % 2 ? 'round' : 'palm'); }
    for (let y = 0; y < R; y++) { tree(0, y, y % 2 ? 'round' : 'light'); if (y % 3 === 0) tree(2, y, 'round'); }
    for (const [x, y, s] of [[8, 6, 'round'], [14, 6, 'light'], [26, 6, 'round'], [9, 11, 'palm'], [24, 15, 'light'], [26, 20, 'round'], [8, 24, 'light'],
      [15, 24, 'round'], [27, 24, 'palm'], [31, 2, 'palm'], [33, 8, 'round'], [31, 11, 'light'], [34, 18, 'palm'], [31, 27, 'round'], [3, 12, 'round'], [3, 20, 'light']]) tree(x, y, s);

    return { cols: C, rows: R, tiles: g.map((r) => r.join('')), objects, flocks: [{ x: 18, y: 12.4, w: 6, h: 1, n: 5 }], start: { x: C - 6, y: 14 } };
  }

  // ব্লক আঁকার সময় টাইল জানার জন্য (setup-এ বসে)
  let api_at = () => 'g';

  function setup(L, api) {
    api_at = L.at;
    const pick = (a) => a[(Math.random() * a.length) | 0];
    const free = (x, y) => L.at(x, y) === 'g' && !L.solid[y * L.C + x];
    const gran = [];
    for (let y = GRANARY.y0; y <= GRANARY.y1; y++) for (let x = GRANARY.x0; x <= GRANARY.x1; x++) if (free(x, y)) gran.push({ x, y });
    L.treasure = pick(gran);
    const spots = [];
    for (let y = 5; y < 25; y++) for (let x = 7; x < 28; x++) if (free(x, y) && !(x >= GRANARY.x0 - 1 && x <= GRANARY.x1 + 1 && y >= GRANARY.y0 - 1 && y <= GRANARY.y1 + 1) && !(x >= 8 && x <= 16 && y >= 15 && y <= 22)) spots.push({ x, y });
    const outside = [];
    for (let y = 2; y < R - 2; y++) for (let x = 30; x < C - 5; x++) if (free(x, y)) outside.push({ x, y });
    [pick(spots.filter((p) => p.y < 12)), pick(spots.filter((p) => p.y > 14)), pick(outside)]
      .forEach((p, i) => L.objects.push({ id: `coin${i}`, kind: 'coin', x: p.x, y: p.y, w: 1, h: 1, solid: false }));
  }

  const lines = (who, ...texts) => texts.map((text) => ({ who, text }));
  const ask = (who, text, choices) => ({ who, text, choices });

  function resetBlocks(L) {
    for (const o of L.objects.filter((b) => b.push)) {
      L.solid[o.y * L.C + o.x] = 0;
      o.x = o.home[0]; o.y = o.home[1]; o.from = null; o.k = 1;
      L.solid[o.y * L.C + o.x] = 1;
    }
  }

  window.LEVELS.mahasthan = {
    digs: 3,
    build,
    setup,
    coinName: 'ছাপাঙ্কিত রুপার মুদ্রা',
    pushBlocked: 'পাথরটা ওদিকে সরবে না, সামনে দেয়াল বা অন্য পাথর।',
    speakers: {
      guide: { name: 'গাইড তানভীর', face: '🧑🏽‍🏫' },
      nani: { name: 'গল্পবলা নানি', face: '👵🏽' },
    },
    objectives: [
      { id: 'talk', text: 'পূর্ব ফটকে গাইড তানভীরের সাথে কথা বলো' },
      { id: 'shovel', text: 'করতোয়ার পাড়ে কৃষকের ঘর থেকে কোদাল নাও' },
      { id: 'slide', text: 'ব্রাহ্মী শিলালিপির টুকরো সাজিয়ে পড়ো' },
      { id: 'push', text: 'খোদার পাথর ভিটায় তিনটি পাথর খোদাই করা চিহ্নে বসাও' },
      { id: 'dig', text: 'শস্যভাণ্ডারে খুঁড়ে রত্নখণ্ড বের করো' },
      { id: 'riddles', text: 'বোনাস: গল্পবলা নানির তিনটি ধাঁধার উত্তর দাও', optional: true },
    ],
    historyCard: 'মহাস্থানগড় বাংলার সবচেয়ে প্রাচীন নগরের নিদর্শন, প্রাচীন নাম পুণ্ড্রনগর। বগুড়ার করতোয়া নদীর তীরে এর অবস্থান, আর কমপক্ষে খ্রিস্টপূর্ব তৃতীয় শতক থেকে এখানে বসতি ছিল। চারদিক উঁচু প্রাচীরে ঘেরা এই দুর্গনগরীতে ১৯৩১ সালে মৌর্য যুগের একটি ব্রাহ্মী শিলালিপি পাওয়া যায়। পণ্ডিতদের মতে এতে দুর্ভিক্ষের সময় শস্যভাণ্ডার থেকে মানুষকে সাহায্য করার নির্দেশ আছে। খননে ছাপাঙ্কিত রুপার মুদ্রা, পোড়ামাটির জিনিস আর নানা যুগের স্থাপনা পাওয়া গেছে।',

    onStart(api) {
      api.say(lines('narrator',
        'বগুড়া, করতোয়া নদীর তীর। নৌকা থেকে নামতেই সামনে উঁচু মাটি-ইটের প্রাচীর, আড়াই হাজার বছরের পুরনো।',
        'এটাই **পুণ্ড্রনগর**, বাংলার সবচেয়ে প্রাচীন নগর। একসময় এখানে রাজা, বণিক আর কারিগরদের কোলাহল ছিল।',
        'পূর্বের ফটকে একজন গাইড পর্যটকদের অপেক্ষায় দাঁড়িয়ে।'));
    },

    onPush(api, o) {
      const L = api.L;
      const covered = L.objects.filter((b) => b.push && L.at(b.x, b.y) === 'q').length;
      if (L.at(o.x, o.y) === 'q') { Sound.sfx('tick'); api.floatText(o.x, o.y, `${BN_DIGITS(covered)}/৩`); }
      if (covered === 3 && !api.isDone('push')) {
        api.complete('push');
        setTimeout(() => {
          if (!api.L) return;
          Sound.sfx('rumble');
          api.openDoor('granaryDoor');
          const tr = L.treasure;
          api.showCircle({ x: tr.x + Math.round((api.rand() - 0.5) * 2), y: tr.y, r: 2.2 });
          api.clue('শস্যভাণ্ডারের <b>পাথরের দরজা খুলে গেছে</b>, ভেতরে ধন');
          api.toast('🪨 গুড়গুড় শব্দে শস্যভাণ্ডারের পাথরের দরজা খুলে গেল!', 3500);
        }, 500);
      }
    },

    interact: {
      async guide(api) {
        if (!api.isDone('talk')) {
          const c = await api.say([
            ...lines('guide',
              'স্বাগতম মহাস্থানগড়ে! আমি তানভীর, এখানকার গাইড।',
              'এর প্রাচীন নাম **পুণ্ড্রনগর**। মৌর্য যুগে, মানে খ্রিস্টপূর্ব তৃতীয় শতকে, এটা ছিল এক জমজমাট নগর। চারদিক এই উঁচু **প্রাচীরে** ঘেরা।',
              '১৯৩১ সালে এখানে একটা পাথরের ফলক পাওয়া যায়, তাতে **ব্রাহ্মী লিপিতে** লেখা। বাংলায় পাওয়া সবচেয়ে পুরনো লেখাগুলোর একটা!'),
            ask('guide', 'আপনি কি শুধু ঘুরতে, নাকি অন্য কিছু?', ['হারানো রত্নখণ্ডের খোঁজে', 'শিলালিপিতে কী লেখা?']),
          ]);
          await api.say(lines('guide',
            c === 0 ? 'রত্ন! তাহলে আমাদের শিলালিপির প্রতিরূপটা দেখুন। ভেঙে টুকরো হয়ে গেছে, জোড়া লাগাতে পারলে হয়তো কোনো সূত্র মিলবে।'
              : 'পণ্ডিতেরা বলেন, তাতে রাজার নির্দেশ আছে: দুর্ভিক্ষের সময় নগরের **শস্যভাণ্ডার** থেকে মানুষকে ধান আর মুদ্রা দিতে হবে। ভাবুন, আড়াই হাজার বছর আগের ত্রাণ!',
            'এই পুরনো **কম্পাসটা** রাখুন। খুঁড়তে হলে নদীর পাড়ে কৃষক ভাইয়ের ঘরে কোদাল পাবেন। আর পাশের **শিলালিপির প্রতিরূপটা** দেখুন।'));
          api.give({ id: 'compass', icon: '🧭', name: 'পুরনো কম্পাস' });
          api.complete('talk');
          return;
        }
        const hint = !api.has('shovel') ? 'নদীর পাড়ে, দক্ষিণে কৃষকের ঘরে কোদাল আছে।'
          : !api.isDone('slide') ? 'পাশের শিলালিপির প্রতিরূপের টুকরোগুলো সাজান।'
          : !api.isDone('push') ? 'খোদার পাথর ভিটায় যান। তিনটা পাথর ঠেলে খোদাই করা গোল চিহ্নে বসাতে হবে। আটকে গেলে বড় কালো পাথরটায় হাত দিন, সব আগের জায়গায় ফিরবে।'
          : 'শস্যভাণ্ডারের দরজা খুলেছে, ভেতরে কম্পাস দেখে খুঁড়ুন।';
        const MENU = ['এখন কী করব?', 'প্রাচীরটা কত বড়?', 'আচ্ছা, আসি'];
        let c = await api.say([ask('guide', 'আর কিছু?', MENU)]);
        while (c !== 2 && c !== undefined) {
          const answer = [[hint], ['আসল প্রাচীর প্রায় দেড় কিলোমিটার লম্বা আর এক কিলোমিটারের বেশি চওড়া, চারকোনা। জায়গায় জায়গায় এখনো অনেক উঁচু।', 'ভেতরে আর আশেপাশে অনেক "ভিটা" মানে উঁচু ঢিবি, যেগুলো খুঁড়ে মন্দির, বিহার আর ঘরবাড়ির ধ্বংসাবশেষ পাওয়া গেছে।']][c];
          c = await api.say([...lines('guide', ...answer), ask('guide', 'আর কিছু?', MENU)]);
        }
      },

      async plaque(api) {
        if (api.isDone('slide')) {
          await api.say(lines('narrator', 'জোড়া লাগানো শিলালিপি: "…দুর্ভিক্ষে প্রজাদের রক্ষা করো, **শস্যভাণ্ডার** থেকে ধান দাও…" নিচে নতুন খোদাই: "ভাণ্ডারের দরজা খোলে **খোদার পাথরের** তিন সঙ্গী ঠিক জায়গায় বসলে।"'));
          return;
        }
        await api.say(lines('narrator', 'চুনাপাথরের শিলালিপির প্রতিরূপ। কেউ ফেলে দিয়েছে, টুকরো টুকরো হয়ে এলোমেলো।'));
        const ok = await api.slide({ image: 'brahmiPlaque', kicker: 'ব্রাহ্মী শিলালিপি', title: 'টুকরো সরিয়ে জোড়া লাগাও',
          hint: 'ফাঁকা ঘরের পাশের টুকরোয় ক্লিক করলে সেটা ফাঁকায় সরে যায়। কোণের ছোট নম্বর ১ থেকে ৮ ক্রমে সাজাও।' });
        if (!ok) return;
        api.complete('slide');
        api.clue('শিলালিপি: ধন <b>শস্যভাণ্ডারে</b>। দরজা খুলতে <b>খোদার পাথর ভিটায়</b> তিন পাথর বসাও');
        await api.say(lines('narrator',
          'টুকরোগুলো মিলতেই লেখাটা পড়া গেল (গাইডের অনুবাদ খোদাই করা আছে পাশে): "…দুর্ভিক্ষে প্রজাদের রক্ষা করো, **শস্যভাণ্ডার** থেকে ধান দাও…"',
          'নিচে কেউ নতুন করে খোদাই করেছে: "ভাণ্ডারের পাথরের দরজা খোলে, যখন **খোদার পাথরের** তিন সঙ্গী তাদের খোদাই করা আসনে বসে।"'));
      },

      async palace(api) {
        await api.say(lines('narrator',
          'ফলকে লেখা: "পরশুরামের প্রাসাদ"। লোককথায় এখানে রাজা পরশুরামের রাজপ্রাসাদ ছিল।',
          'প্রত্নতাত্ত্বিকেরা অবশ্য বলেন, এখানকার ধ্বংসাবশেষগুলো নানা যুগের, অনেক পরে তৈরি। গল্প আর ইতিহাস এখানে মিলেমিশে আছে!'));
      },

      async well(api) {
        await api.say(lines('narrator', 'জিয়ৎ কুণ্ড, এক প্রাচীন কূপ। লোককথায় বলে, এর পানি ছিটালে নাকি আহত সৈন্যরা আবার সুস্থ হয়ে উঠত! অবশ্য এটা শুধুই গল্প।'));
      },

      async hut(api) {
        if (api.has('shovel')) { await api.say(lines('narrator', 'কৃষকের ঘরে লাঙল, জোয়াল আর ধানের গোলা। কৃষক ভাই এখনো মাঠে।')); return; }
        await api.say(lines('narrator', 'কৃষক ভাই মাঠে গেছেন। দরজায় হাতে লেখা চিরকুট: "**কোদাল** লাগলে নিয়ে যান, কাজ শেষে ফেরত দিয়েন।" 😄'));
        api.give({ id: 'shovel', icon: '⛏', name: 'কৃষকের কোদাল' });
        api.complete('shovel');
      },

      async slab(api) {
        if (api.isDone('push')) { await api.say(lines('narrator', 'খোদার পাথর: বিশাল কালো পাথরের ফলক। লোকে এখানে ফুল আর প্রদীপ রেখে যায়।')); return; }
        const c = await api.say([
          ...lines('narrator', '**খোদার পাথর**: বিশাল এক কালো পাথরের ফলক। চারপাশে তিনটা ছোট পাথর এলোমেলো পড়ে, আর মেঝেতে তিনটা গোল খোদাই।'),
          ask('narrator', 'কী করবে?', ['পাথরগুলো ঠেলে চিহ্নে বসাব', 'পাথরগুলো আগের জায়গায় ফিরিয়ে দাও']),
        ]);
        if (c === 1) { resetBlocks(api.L); Sound.sfx('rumble'); api.toast('পাথরগুলো আগের জায়গায় ফিরে গেছে।', 2200); return; }
        api.toast('🪨 পাথরের দিকে হাঁটলে বা পাথরে ট্যাপ করলে সেটা ঠেলা যায়। কোণে আটকে গেলে এখানে এসে আবার শুরু করো।', 4500);
      },

      async granaryDoor(api) {
        await api.say(lines('narrator', 'শস্যভাণ্ডারের ভারী পাথরের দরজা। গায়ে খোদাই: "খোদার পাথরের তিন সঙ্গী আসনে বসলে আমি খুলব।"'));
      },

      async nani(api) {
        if (api.isDone('riddles')) { await api.say(lines('nani', 'তোমার মতো বুদ্ধিমান নাতি-নাতনি পাইলে বুড়ির মন ভরে যায়! ভালো থাইকো।')); return; }
        const c = await api.say([
          ...lines('nani',
            'আয় আয়, বস। এই কূপের ধারে বইসা আমি কত গল্প শুনাই সবাইরে!',
            'কিন্তু আগে ধাঁধা। আমার **তিনটা ধাঁধার** উত্তর দিতে পারলে একটা জিনিস দিমু।'),
          ask('nani', 'রাজি?', ['রাজি, নানি!', 'পরে আসব']),
        ]);
        if (c !== 0) return;
        for (let i = 0; i < RIDDLES.length; i++) {
          const ok = await api.quiz(Object.assign({ kicker: `নানির ধাঁধা ${BN_DIGITS(i + 1)}/৩` }, RIDDLES[i]));
          if (!ok) { await api.say(lines('nani', 'হি হি, পারলা না! ভাইবা-চিন্তা আবার আসো।')); return; }
        }
        api.complete('riddles');
        api.flag('sightBonus', 1.6);
        api.give({ id: 'lantern', icon: '🪔', name: 'মাটির প্রদীপ' });
        api.addDigs(1);
        await api.say(lines('nani', 'বাহ বাহ, তিনটাই ঠিক! এই নে আমার **মাটির প্রদীপ**, অন্ধকারে পথ দেখাইব। আর এই নে কোদালের নতুন হাতল, **একবার** বেশি খুঁড়তে পারবি।'));
      },
    },
  };
})();
