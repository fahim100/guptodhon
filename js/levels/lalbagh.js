// লেভেল ১: লালবাগ কেল্লা (টিউটোরিয়াল)
// টাইল: # প্রাচীর · g ঘাস · p ইটের পথ · f ফুলের বাগান · w পুকুর · c পানির নালা · G ফটক
(function () {
  const C = 32, R = 24;

  // মাজারের চারপাশের চার বাগান
  const QUADS = {
    nw: { name: 'উত্তর-পশ্চিম', test: (x, y) => x <= 12 && y <= 8 },
    ne: { name: 'উত্তর-পূর্ব', test: (x, y) => x >= 18 && y <= 8 },
    sw: { name: 'দক্ষিণ-পশ্চিম', test: (x, y) => x <= 12 && y >= 14 },
    se: { name: 'দক্ষিণ-পূর্ব', test: (x, y) => x >= 18 && y >= 14 },
  };

  function build() {
    const g = [];
    for (let y = 0; y < R; y++) g.push(new Array(C).fill('g'));
    const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < C && y < R) g[y][x] = t; };
    const rect = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, t); };

    // প্রাচীর আর ভেতরের চারপাশের পথ
    for (let x = 0; x < C; x++) { set(x, 0, '#'); set(x, R - 1, '#'); set(x, 1, 'p'); set(x, R - 2, 'p'); }
    for (let y = 0; y < R; y++) { set(0, y, '#'); set(C - 1, y, '#'); set(1, y, 'p'); set(C - 2, y, 'p'); }
    for (let x = 0; x < C; x++) { set(x, 0, '#'); set(x, R - 1, '#'); }
    for (let y = 0; y < R; y++) { set(0, y, '#'); set(C - 1, y, '#'); }
    rect(14, R - 1, 16, R - 1, 'G'); // দক্ষিণ ফটক

    // উত্তর-দক্ষিণ প্রধান পথ, মাঝখানে নালা
    for (let y = 1; y < R - 1; y++) { set(14, y, 'p'); set(16, y, 'p'); set(15, y, 'p'); }
    for (let y = 2; y <= 7; y++) set(15, y, 'c');
    for (let y = 15; y <= 19; y++) set(15, y, 'c');
    set(15, 5, 'p'); set(15, 17, 'p'); // সাঁকো

    // পূর্ব-পশ্চিম পথ, মাঝখানে নালা
    for (let x = 1; x <= 22; x++) { set(x, 10, 'p'); set(x, 11, 'p'); set(x, 12, 'p'); }
    for (let x = 2; x <= 12; x++) set(x, 11, 'c');
    for (let x = 19; x <= 21; x++) set(x, 11, 'c');
    set(7, 11, 'p'); // সাঁকো

    // মসজিদের সামনের পথ
    rect(5, 7, 6, 9, 'p');
    // পুকুর আর তার ঘাট
    rect(19, 2, 27, 7, 'p');
    rect(20, 3, 26, 6, 'w');
    // মালির ঘরের পথ
    rect(4, 20, 4, 21, 'p');

    // ফুলের বাগান (প্রতি চতুর্ভাগে)
    const beds = [
      [9, 3], [3, 13], [9, 13], [9, 16], [7, 19],
      [19, 14], [22, 15], [26, 15], [18, 18], [22, 19], [27, 19], [9, 6],
    ];
    for (const [bx, by] of beds) rect(bx, by, bx + 1, by + 1, 'f');

    // মাজারের নিচে আর সামনে পাকা চত্বর
    rect(12, 8, 18, 14, 'p');

    const objects = [];
    const add = (o) => objects.push(o);

    // দালান
    add({ id: 'tomb', kind: 'building', style: 'tomb', x: 13, y: 9, w: 5, h: 5, door: { x: 15, y: 14 }, interact: true, prompt: 'মাজার দেখো',
      optional: true, bubble: (api) => api.flag('metMithu') && !api.isDone('tiles') });
    add({ id: 'mosque', kind: 'building', style: 'mosque', x: 3, y: 3, w: 6, h: 4, door: { x: 5, y: 7 }, interact: true, prompt: 'পুঁথি পড়ো',
      bubble: (api) => api.isDone('talk') && !api.isDone('quiz') });
    add({ id: 'diwan', kind: 'building', style: 'diwan', x: 23, y: 8, w: 7, h: 5, door: { x: 22, y: 11 }, interact: true, prompt: 'সিন্দুক খোলো',
      bubble: (api) => api.isDone('talk') && !api.isDone('lock') });
    add({ id: 'hut', kind: 'building', style: 'hut', x: 3, y: 17, w: 3, h: 3, door: { x: 4, y: 20 }, interact: true, prompt: 'ঘরে ঢোকো',
      bubble: (api) => api.isDone('talk') && !api.has('shovel') });
    add({ id: 'gate', kind: 'gate', x: 13, y: R - 1, w: 5, h: 1, solid: false });

    // চরিত্র ও জিনিস
    add({ id: 'chowkidar', kind: 'npc', x: 18, y: 21, interact: true, prompt: 'কথা বলো', bubble: (api) => !api.isDone('talk') });
    add({ id: 'stele', kind: 'stele', x: 12, y: 20, interact: true, prompt: 'ফলক পড়ো', bubble: (api) => api.isDone('talk') && !api.flag('readStele') && !api.isDone('lock') });
    add({ id: 'f1', kind: 'fountain', x: 15, y: 3 });
    add({ id: 'f2', kind: 'fountain', x: 15, y: 18 });
    add({ id: 'f3', kind: 'fountain', x: 3, y: 11 });
    add({ id: 'mithu', kind: 'npc', style: 'kid', x: 12, y: 14, interact: true, prompt: 'কথা বলো', optional: true, bubble: (api) => !api.flag('metMithu') });

    // গাছ: প্রাচীরের ধারে আর প্রধান পথের দুপাশে সুপারি গাছ
    const free = (x, y) => g[y][x] === 'g' && !objects.some((o) => x >= o.x && x < o.x + (o.w || 1) && y >= o.y - 1 && y < o.y + (o.h || 1) + 1);
    const tree = (x, y, style) => { if (free(x, y)) add({ id: `t${x}_${y}`, kind: 'tree', style, x, y }); };
    for (let x = 2; x <= 29; x += 2) { tree(x, 2, x % 4 ? 'round' : 'light'); tree(x + 1, 21, x % 4 ? 'light' : 'round'); }
    for (let y = 4; y <= 20; y += 3) { tree(2, y, 'round'); tree(29, y, 'light'); }
    for (const y of [3, 6, 16, 19]) { tree(13, y, 'palm'); tree(17, y, 'palm'); }
    tree(11, 5, 'round'); tree(20, 9, 'light'); tree(8, 21, 'round'); tree(25, 21, 'round');
    tree(10, 14, 'light'); tree(25, 17, 'round'); tree(20, 16, 'palm'); tree(6, 15, 'palm');

    // কবুতরের ঝাঁক (ঘরের হিসাবে এলাকা)
    const flocks = [{ x: 12.6, y: 14.4, w: 4.8, h: 1.4, n: 7 }, { x: 4.6, y: 8.2, w: 2.2, h: 1.6, n: 4 }, { x: 19.5, y: 7.2, w: 6, h: 0.8, n: 4 }];
    return { cols: C, rows: R, tiles: g.map((r) => r.join('')), objects, flocks, start: { x: 15, y: 21 } };
  }

  function setup(L, api) {
    const blocked = (x, y) => L.solid[y * L.C + x];
    const objAt = (x, y) => L.objects.some((o) => o.kind !== 'none' && x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h);
    const diggable = (x, y) => ['g', 'f'].includes(L.at(x, y)) && !blocked(x, y) && !objAt(x, y);

    // গুপ্তধনের জায়গা
    const keys = Object.keys(QUADS);
    const qk = keys[(Math.random() * keys.length) | 0];
    const cand = [];
    for (let y = 2; y < L.R - 2; y++) for (let x = 2; x < L.C - 2; x++) if (QUADS[qk].test(x, y) && diggable(x, y)) cand.push({ x, y });
    L.treasure = cand[(Math.random() * cand.length) | 0];
    L.flags.quad = QUADS[qk].name;

    // মুদ্রা: অন্য তিন বাগানে একটা করে
    const others = keys.filter((k) => k !== qk);
    for (const k of others) {
      const c = [];
      for (let y = 2; y < L.R - 2; y++) for (let x = 2; x < L.C - 2; x++) if (QUADS[k].test(x, y) && diggable(x, y)) c.push({ x, y });
      const p = c[(Math.random() * c.length) | 0];
      L.objects.push({ id: `coin${k}`, kind: 'coin', x: p.x, y: p.y, w: 1, h: 1, solid: false });
    }
  }

  const lines = (who, ...texts) => texts.map((text) => ({ who, text }));
  const ask = (who, text, choices) => ({ who, text, choices });

  // মসজিদের পুঁথির প্রশ্ন — প্রতিবার একটা এলোমেলোভাবে আসে (উত্তর চৌকিদারের কথায় আছে)
  const QUIZ = [
    { question: 'লালবাগ কেল্লার নির্মাণকাজ কে শুরু করেছিলেন?', options: ['ঈসা খাঁ', 'শাহজাদা মুহাম্মদ আজম', 'নবাব সিরাজউদ্দৌলা', 'খান জাহান আলী'], answer: 1 },
    { question: 'পরী বিবি কার কন্যা ছিলেন?', options: ['সুবাদার শায়েস্তা খান', 'সম্রাট শাহজাহান', 'ঈসা খাঁ', 'মীর জুমলা'], answer: 0 },
    { question: 'লালবাগ কেল্লা কোন নদীর তীরের শহরে?', options: ['কর্ণফুলী', 'সুরমা', 'বুড়িগঙ্গা', 'তিস্তা'], answer: 2 },
    { question: 'লালবাগ কেল্লার কাজ কেন আর শেষ হয়নি?', options: ['বন্যায় ভেসে গিয়েছিল', 'পরী বিবির মৃত্যুর পর কাজ বন্ধ হয়', 'টাকা ফুরিয়ে গিয়েছিল', 'ভূমিকম্পে ভেঙে পড়েছিল'], answer: 1 },
  ];

  window.LEVELS.lalbagh = {
    digs: 5,
    build,
    setup,
    objectives: [
      { id: 'talk', text: 'ফটকের কাছে চৌকিদারের সাথে কথা বলো' },
      { id: 'shovel', text: 'মালির ঘর থেকে কোদাল নাও' },
      { id: 'quiz', text: 'মসজিদের পুরনো পুঁথির ধাঁধার উত্তর দাও' },
      { id: 'lock', text: 'দিওয়ান-ই-আমের সিন্দুকের তালা খোলো' },
      { id: 'dig', text: 'সঠিক জায়গায় খুঁড়ে রত্নখণ্ড বের করো' },
      { id: 'tiles', text: 'বোনাস: মাজারের মেঝের টালির নকশা মেলাও', optional: true },
    ],
    historyCard: 'লালবাগ কেল্লার আসল নাম ছিল "কেল্লা আওরঙ্গাবাদ"। ১৬৭৮ সালে শাহজাদা মুহাম্মদ আজম এর কাজ শুরু করেন, পরে সুবাদার শায়েস্তা খান কাজ এগিয়ে নেন। ১৬৮৪ সালে তাঁর কন্যা পরী বিবির মৃত্যুর পর তিনি একে অশুভ মনে করে কাজ বন্ধ করে দেন। কেল্লার ভেতরে আছে পরী বিবির মাজার, তিন গম্বুজের মসজিদ আর দুই তলার দিওয়ান-ই-আম।',

    onStart(api) {
      api.say(lines('narrator',
        'বুড়িগঙ্গার তীরে, পুরান ঢাকার লালবাগ। লাল ইটের উঁচু প্রাচীর পেরিয়ে তুমি কেল্লার দক্ষিণ ফটক দিয়ে ঢুকলে।',
        'চারদিক কুয়াশায় ঢাকা। যত হাঁটবে, তত জায়গা চোখে পড়বে। **তীরচিহ্ন/WASD** চাপো বা যেখানে যেতে চাও সেখানে **ক্লিক** করো। **Shift** চেপে ধরলে দৌড়াবে।',
        'মাথার উপর সোনালি **!** মানে জরুরি কাজ, নীল **?** মানে বোনাস। পাশের চৌকিদারকে দেখতে পাচ্ছ?'));
    },

    interact: {
      async chowkidar(api) {
        if (!api.isDone('talk')) {
          await api.say([
            ...lines('chowkidar',
              'আসসালামু আলাইকুম, অভিযাত্রী! লালবাগ কেল্লায় স্বাগতম।',
              '**১৬৭৮** সালে সম্রাট আওরঙ্গজেবের পুত্র **শাহজাদা মুহাম্মদ আজম** এই কেল্লার কাজ শুরু করেন। পরে সুবাদার **শায়েস্তা খান** কাজ এগিয়ে নেন।',
              'কিন্তু তাঁর আদরের কন্যা **পরী বিবি** মারা গেলে শায়েস্তা খান কাজ বন্ধ করে দেন। কেল্লাটা আর কখনো শেষ হয়নি।',
              'লোকে বলে, এই বাগানের মাটির নিচে এক হারানো রাজকোষের **রত্নখণ্ড** লুকানো আছে…'),
            ask('chowkidar', 'তা তুমি কি সেই রত্নের খোঁজেই এসেছ?', ['হ্যাঁ চাচা, আমি গুপ্তধন খুঁজতে এসেছি!', 'না না, এমনি ঘুরতে এসেছি…']),
          ]).then(async (c) => {
            await api.say(lines('chowkidar', c === 0
              ? 'বাহ, সাহস আছে দেখছি! তাহলে এই পুরনো **কম্পাসটা** নাও। গুপ্তধনের যত কাছে যাবে, এটা তত গরম হয়ে উঠবে!'
              : 'হা হা! চোখ দেখেই বুঝেছি তুমি অভিযাত্রী। এই পুরনো **কম্পাসটা** রাখো। গুপ্তধনের কাছে গেলে এটা গরম হয়ে ওঠে!'));
          });
          api.give({ id: 'compass', icon: '🧭', name: 'পুরনো কম্পাস' });
          await api.say(lines('chowkidar',
            'খুঁড়তে হলে **কোদাল** লাগবে। দক্ষিণ-পশ্চিম কোণে **মালির ঘরে** একটা পাবে।',
            'আর সূত্র খুঁজতে চাইলে পশ্চিমের **মসজিদের পুঁথি** আর পূর্বের **দিওয়ান-ই-আমের সিন্দুক** দেখো। সাবধান, কোদাল কিন্তু **৫ বারের** বেশি টিকবে না!'));
          api.complete('talk');
          return;
        }
        // প্রশ্ন বেছে নিয়ে কথা বলা
        const hint = !api.has('shovel') ? 'আগে মালির ঘর থেকে কোদালটা নিয়ে নাও, দক্ষিণ-পশ্চিম কোণে।'
          : !api.isDone('quiz') ? 'মসজিদের পুঁথিতে লেখা আছে ধন কোন বাগানে। পশ্চিমের তিন গম্বুজওয়ালা দালানটা।'
          : !api.isDone('lock') ? 'দিওয়ান-ই-আমের সিন্দুকের তালার সংখ্যা? ফটকের পাশের পাথরের ফলকটা পড়ে দেখো।'
          : 'লাল বৃত্তের ভেতরে কম্পাস দেখে দেখে খোঁড়ো। "আগুন গরম" হলেই বুঝবে কাছে এসেছ!';
        const MENU = ['এখন কোথায় যাব?', 'কেল্লার ইতিহাসটা আবার বলুন', 'সুড়ঙ্গের গল্পটা কী?', 'আচ্ছা চাচা, আসি'];
        let c = await api.say([ask('chowkidar', 'আর কিছু জানতে চাও, অভিযাত্রী?', MENU)]);
        while (c !== 3 && c !== undefined) {
          const answer = [
            [hint],
            ['কেল্লার আসল নাম ছিল **কেল্লা আওরঙ্গাবাদ**। ১৬৭৮ সালে শাহজাদা আজম শুরু করেন, পরে শায়েস্তা খান কাজ এগিয়ে নেন।',
              'ভেতরে তিনটা প্রধান দালান: পশ্চিমে **মসজিদ**, মাঝে **পরী বিবির মাজার**, পূর্বে **দিওয়ান-ই-আম**। দিওয়ানের সাথেই ছিল সুবাদারের **হাম্মামখানা**।'],
            ['লোকে বলে, কেল্লার নিচে গোপন **সুড়ঙ্গ** আছে, যা দিয়ে নাকি বুড়িগঙ্গা পর্যন্ত যাওয়া যেত!',
              'কেউ বলে সেই সুড়ঙ্গে ঢুকলে আর ফেরা যায় না… হা হা, আমি অবশ্য কখনো দেখিনি। এসব গল্পকথা!'],
          ][c];
          c = await api.say([...lines('chowkidar', ...answer), ask('chowkidar', 'আর কিছু?', MENU)]);
        }
        await api.say(lines('chowkidar', 'সাবধানে থেকো। আল্লাহ হাফেজ!'));
      },

      async mithu(api) {
        if (!api.flag('metMithu')) {
          api.flag('metMithu', true);
          const c = await api.say([
            ...lines('mithu',
              'এই যে অভিযাত্রী! আমি **মিঠু**। রোজ বিকালে এখানে কবুতরকে দানা খাওয়াই।',
              'জানো, পরী বিবির মাজারের ভেতরের মেঝেতে খুব সুন্দর **টালির নকশা** আছে। কে যেন টালিগুলো এলোমেলো করে দিয়েছে!'),
            ask('mithu', 'তুমি ঠিক করে দিতে পারবে?', ['অবশ্যই! চেষ্টা করে দেখি।', 'কবুতরগুলো এত উড়ে যায় কেন?']),
          ]);
          await api.say(lines('mithu', c === 0
            ? 'সত্যি? মাজারের দরজায় গিয়ে দেখো। নকশা মেলাতে পারলে চৌকিদার চাচা নিশ্চয়ই কিছু উপহার দেবে!'
            : 'তুমি কাছে গেলেই ওরা ভয় পেয়ে ফুড়ুৎ! একটু পরে আবার ফিরে আসে। আর হ্যাঁ, মাজারের মেঝের টালিগুলো ঠিক করে দিও কিন্তু!'));
          return;
        }
        if (api.isDone('tiles')) { await api.say(lines('mithu', 'বাহ! নকশাটা আবার আগের মতো ঝকঝকে। শুনেছি বাগানের ঘাসে পুরনো **মুঘল মুদ্রা** চকচক করে, খুঁজে দেখো!')); return; }
        await api.say(lines('mithu', 'মাজারের দরজায় যাও! মাঝের টালিটা নড়ে না, ওটা দেখে বাকিগুলো ঘোরাও।'));
      },

      async hut(api) {
        if (api.has('shovel')) { await api.say(lines('narrator', 'মালির ঘরে খুরপি, ঝাঁঝরি আর শুকনো পাতার স্তূপ। আর কিছু কাজের নেই।')); return; }
        await api.say(lines('narrator', 'খড়ের চালের ছোট্ট মালির ঘর। দেয়ালে একটা পুরনো লোহার **কোদাল** ঝুলছে।'));
        api.give({ id: 'shovel', icon: '⛏', name: 'কোদাল' });
        api.complete('shovel');
        api.toast('⛏ কোদাল পেয়েছ! ঘাস বা ফুলের বাগানে দাঁড়িয়ে <b>খোঁড়ো</b> বোতাম বা <b>F</b> চাপো।', 4000);
      },

      async mosque(api) {
        if (api.isDone('quiz')) { await api.say(lines('narrator', `পুঁথির শেষ পাতা: "রত্ন ঘুমায় মাজারের **${api.flag('quad')}** দিকের বাগানে।"`)); return; }
        await api.say(lines('narrator', 'তিন গম্বুজের মসজিদ। এক কোণে কাঠের রেহেলে একটা পুরনো পুঁথি। পাতা ওল্টাতেই একটা প্রশ্ন চোখে পড়ল…'));
        if (api.flag('quizIdx') === undefined) api.flag('quizIdx', (api.rand() * QUIZ.length) | 0);
        const ok = await api.quiz(QUIZ[api.flag('quizIdx')]);
        if (!ok) { await api.say(lines('narrator', 'পুঁথির অক্ষরগুলো ঝাপসা হয়ে এল। চৌকিদারের কথাগুলো মনে করে আবার এসো।')); return; }
        api.complete('quiz');
        api.clue(`ধন আছে মাজারের <b>${api.flag('quad')}</b> দিকের বাগানে`);
        await api.say(lines('narrator', `ঠিক উত্তর! পুঁথির শেষ পাতায় লাল কালিতে লেখা: "রত্ন ঘুমায় মাজারের **${api.flag('quad')}** দিকের বাগানে।"`));
      },

      async stele(api) {
        api.flag('readStele', true);
        await api.say(lines('narrator', 'পাথরের ফলকে ফারসি আর বাংলায় খোদাই করা: "শাহজাদা আজম যে বছর এই দুর্গের প্রথম ইট গাঁথেন, সেই বছর **ষোলোশো আটাত্তর** খ্রিস্টাব্দ।"'));
      },

      async diwan(api) {
        if (api.isDone('lock')) { await api.say(lines('narrator', 'খালি সিন্দুক। ছেঁড়া মানচিত্রটা এখন তোমার কাছে।')); return; }
        await api.say(lines('narrator', 'দুই তলার দিওয়ান-ই-আম, যেখানে সুবাদার দরবার বসাতেন। ভেতরে একটা ভারী লোহার সিন্দুক, চার অঙ্কের তালা লাগানো।'));
        const ok = await api.lock({ code: '1678', hint: 'তালার গায়ে খোদাই: "যে বছর কেল্লার প্রথম ইট গাঁথা হয়েছিল"' });
        if (!ok) return;
        api.complete('lock');
        api.give({ id: 'map', icon: '🗺', name: 'ছেঁড়া মানচিত্র' });
        const tr = api.L.treasure;
        const ox = Math.round((api.rand() - 0.5) * 2), oy = Math.round((api.rand() - 0.5) * 2);
        api.showCircle({ x: tr.x + ox, y: tr.y + oy, r: 2.6 });
        api.clue('ছেঁড়া মানচিত্রে বাগানের এক জায়গায় <b>লাল বৃত্ত</b> আঁকা');
        await api.say(lines('narrator', 'সিন্দুকে একটা **ছেঁড়া মানচিত্র**! তাতে বাগানের এক কোণে লাল কালিতে একটা বৃত্ত আঁকা। মাটিতেও সেই বৃত্ত ফুটে উঠল…'));
      },

      async tomb(api) {
        if (api.isDone('tiles')) {
          await api.say(lines('narrator', 'মাজারের মেঝের ফুলের নকশা আবার ঝকঝক করছে। নীল, সবুজ আর লাল টালিতে আট পাপড়ির ফুল।'));
          return;
        }
        const c = await api.say([
          ...lines('narrator',
            'পরী বিবির মাজার। ভেতরে সাদা মার্বেল, কালো পাথর আর রঙিন টালির কাজ। মাঝের গম্বুজটা একসময় তামা-পিতলের পাতে মোড়া ছিল।',
            'শায়েস্তা খানের কন্যা পরী বিবি ১৬৮৪ সালে মারা যান। তাঁর স্মৃতিতেই এই সমাধিসৌধ।'),
          ask('narrator', 'মেঝের মাঝখানে নকশা করা কয়েকটা টালি এলোমেলো হয়ে আছে…', ['টালিগুলো ঠিক করে দাও', 'এখন না']),
        ]);
        if (c !== 0) return;
        const ok = await api.tiles({ hint: 'টালিতে ক্লিক করলে ৯০° ঘোরে। মাঝেরটা নড়ে না। আট পাপড়ির ফুল আর কোণের নকশা মিলিয়ে দাও।' });
        if (!ok) return;
        api.complete('tiles');
        api.flag('sightBonus', 1.6);
        api.give({ id: 'lantern', icon: '🏮', name: 'পিতলের লণ্ঠন' });
        api.addDigs(1);
        await api.say(lines('narrator',
          'নকশা মিলতেই একটা আলগা টালির নিচে পাওয়া গেল পুরনো **পিতলের লণ্ঠন**! এখন কুয়াশার ভেতর আরও দূর পর্যন্ত দেখা যাবে।',
          'সাথে একটা মজবুত কাঠের হাতল। কোদাল এখন আরও **একবার** বেশি খোঁড়া যাবে।'));
      },
    },
  };
})();
