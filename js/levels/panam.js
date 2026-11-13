// লেভেল ২: পানাম নগর — চাবি আর তালাবদ্ধ দরজার রহস্য
// টাইল: k খাল · b কাঠের সাঁকো · p ইটের রাস্তা · g ঘাস · f ফুলের বাগান · w পুকুর · # দেয়াল
(function () {
  const C = 40, R = 24;
  const STREET = [10, 12]; // রাস্তার সারি

  // উঠানগুলো (বাড়ির পেছনে, দেয়াল আর খাল দিয়ে ঘেরা)
  const YARDS = {
    nw: { name: 'উত্তর-পশ্চিমের', test: (x, y) => x >= 3 && x <= 19 && y >= 2 && y <= 5 },
    ne: { name: 'উত্তর-পূর্বের', test: (x, y) => x >= 21 && x <= 36 && y >= 2 && y <= 5 },
    sw: { name: 'দক্ষিণ-পশ্চিমের', test: (x, y) => x >= 3 && x <= 19 && y >= 17 && y <= 21 },
    se: { name: 'দক্ষিণ-পূর্বের', test: (x, y) => x >= 21 && x <= 36 && y >= 17 && y <= 21 },
  };

  const MERCHANTS = [
    'কৃষ্ণধন সাহা', 'রাধাকান্ত পোদ্দার', 'গোপীনাথ বসাক', 'হরিচরণ দত্ত', 'মহেন্দ্রলাল সাহা', 'জগবন্ধু বণিক',
    'শ্যামসুন্দর পোদ্দার', 'নিত্যানন্দ বসাক', 'কালীপদ সাহা', 'গৌরহরি দাস', 'দীননাথ পাল', 'রামচরণ বসাক',
  ];
  const TRADES = ['কাপড়ের কারবারি', 'মসলিন-বণিক', 'সোনা-রুপার কারবারি', 'লবণের আড়তদার', 'পাটের ব্যবসায়ী', 'মহাজন'];

  const LOOKS = {
    majhi: { skin: '#8a5a3a', top: '#ece6d6', bottom: '#2f5e3a', checks: true, gamchha: true, hat: 'mathal', pole: true, beard: '#3a3a3a', phase: 1 },
    rahela: { skin: '#9c6b4a', top: '#1f7a6a', bottom: '#1f7a6a', border: '#c0392b', saree: true, veil: true, hair: '#d8d8d8', phase: 2 },
  };

  function build() {
    const g = [];
    for (let y = 0; y < R; y++) g.push(new Array(C).fill('g'));
    const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < C && y < R) g[y][x] = t; };
    const rect = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, t); };

    // চারপাশে খাল
    rect(0, 0, C - 1, 1, 'k'); rect(0, R - 2, C - 1, R - 1, 'k');
    rect(0, 0, 1, R - 1, 'k'); rect(C - 2, 0, C - 1, R - 1, 'k');
    rect(0, 10, 1, 12, 'b'); // পশ্চিমের সাঁকো
    // রাস্তা আর পাড়ের পথ
    rect(2, STREET[0], C - 3, STREET[1], 'p');
    rect(2, 9, 2, 13, 'p'); rect(C - 3, 9, C - 3, 13, 'p');
    rect(2, 2, 2, 8, '#'); rect(2, 14, 2, 21, '#');
    rect(C - 3, 2, C - 3, 8, '#'); rect(C - 3, 14, C - 3, 21, '#');
    // গলি
    for (const ax of [12, 27]) { rect(ax, 6, ax, 9, 'p'); rect(ax, 13, ax, 16, 'p'); }
    // উঠানের মাঝের দেয়াল
    rect(20, 2, 20, 5, '#'); rect(20, 17, 20, 21, '#');
    // পুকুর
    rect(30, 2, 33, 3, 'w');
    rect(5, 19, 8, 20, 'w');
    // ফুলের বাগান
    for (const [bx, by] of [[8, 2], [16, 3], [23, 4], [35, 2], [14, 18], [11, 20], [30, 20], [34, 18]]) rect(bx, by, bx + 1, by + 1, 'f');
    // উঠানে গলির মুখে ইটের পথ
    for (const ax of [12, 27]) { rect(ax - 1, 5, ax + 1, 5, 'p'); rect(ax - 1, 17, ax + 1, 17, 'p'); }

    const objects = [];
    const add = (o) => objects.push(o);

    // উত্তরের সারির বাড়ি (সামনের দিক রাস্তায়)
    const north = [[3, 4], [7, 5], [13, 4], [17, 5, 'nachghar'], [22, 5], [28, 4], [32, 5]];
    const south = [[3, 5], [8, 4], [13, 5], [18, 4], [22, 5, 'gadighar'], [28, 5], [33, 4]];
    let v = 0;
    north.forEach(([x, w, role], i) => add({
      id: role || `n${i}`, kind: 'building', style: role === 'nachghar' ? 'nachghar' : 'panam', variant: v++, x, y: 6, w, h: 4,
      door: { x: x + Math.floor(w / 2), y: STREET[0] }, interact: true, side: 'উত্তর', role: role || 'plaque',
      prompt: role === 'nachghar' ? 'নাচঘরে ঢোকো' : 'ফলক পড়ো',
    }));
    south.forEach(([x, w, role], i) => add({
      id: role || `s${i}`, kind: 'building', style: 'panamBack', variant: v++, x, y: 13, w, h: 4,
      door: { x: x + Math.floor(w / 2), y: STREET[1] }, interact: true, side: 'দক্ষিণ', role: role || 'plaque',
      prompt: role === 'gadighar' ? 'গদিঘরে ঢোকো' : 'ফলক পড়ো',
    }));

    // গলির দরজা
    add({ id: 'gateA', kind: 'door', x: 12, y: 9, open: true });
    add({ id: 'gateB', kind: 'door', x: 27, y: 9, lockColor: '#d9a441', interact: true, prompt: 'পিতলের তালা', door: { x: 27, y: 10 },
      bubble: (api) => api.has('brassKey') });
    add({ id: 'gateC', kind: 'door', x: 12, y: 13, lockColor: '#7a7f86', interact: true, prompt: 'লোহার তালা', door: { x: 12, y: 12 },
      bubble: (api) => api.has('ironKey') });
    add({ id: 'gateD', kind: 'door', x: 27, y: 13, open: true });

    // চরিত্র ও জিনিস
    add({ id: 'majhi', kind: 'npc', look: LOOKS.majhi, x: 2, y: 13, interact: true, prompt: 'কথা বলো', bubble: (api) => !api.isDone('talk') });
    add({ id: 'rahela', kind: 'npc', look: LOOKS.rahela, x: 25, y: 19, interact: true, prompt: 'কথা বলো', optional: true, bubble: (api) => !api.isDone('kantha') });
    add({ id: 'loom', kind: 'prop', x: 23, y: 19, w: 2, h: 1, draw: (ctx, t, T, o) => Art.loom(ctx, o.x * T, o.y * T, t) });
    add({ id: 'shed', kind: 'building', style: 'hut', x: 4, y: 2, w: 3, h: 3, door: { x: 5, y: 5 }, interact: true, prompt: 'ঘরে ঢোকো',
      bubble: (api) => api.isDone('talk') && !api.has('shovel') });
    const boat = (id, x, y, len) => add({ id, kind: 'decor', x, y, w: 1, h: 1, water: true, draw: (ctx, t, T, o) => Art.boat(ctx, o.x * T + T / 2, o.y * T + T / 2, t + o.x, len) });
    boat('boat1', 0.5, 15, 96); boat('boat2', 16, 22.4, 120); boat('boat3', 30, 0.6, 90); boat('boat4', 38.5, 6, 80);

    // গাছ
    const free = (x, y) => g[y][x] === 'g' && !objects.some((o) => x >= Math.floor(o.x) && x < o.x + (o.w || 1) && y >= o.y - 1 && y < o.y + (o.h || 1) + 1);
    const tree = (x, y, style) => { if (free(x, y)) add({ id: `t${x}_${y}`, kind: 'tree', style, x, y }); };
    for (const [x, y, s] of [[3, 3, 'round'], [10, 2, 'light'], [14, 2, 'round'], [18, 4, 'palm'], [22, 2, 'palm'], [26, 3, 'round'], [35, 4, 'light'], [36, 3, 'round'],
      [3, 17, 'palm'], [9, 18, 'round'], [17, 20, 'light'], [19, 18, 'round'], [22, 21, 'palm'], [33, 21, 'light'], [36, 19, 'round'], [29, 17, 'light']]) tree(x, y, s);

    const flocks = [{ x: 14, y: 10.3, w: 10, h: 2, n: 8 }, { x: 29, y: 10.4, w: 6, h: 1.6, n: 5 }];
    return { cols: C, rows: R, tiles: g.map((r) => r.join('')), objects, flocks, start: { x: 1, y: 11 } };
  }

  function setup(L, api) {
    const blocked = (x, y) => L.solid[y * L.C + x];
    const objAt = (x, y) => L.objects.some((o) => o.kind !== 'decor' && x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h);
    const diggable = (x, y) => ['g', 'f'].includes(L.at(x, y)) && !blocked(x, y) && !objAt(x, y);
    const tilesIn = (k) => { const c = []; for (let y = 2; y < L.R - 2; y++) for (let x = 3; x < L.C - 3; x++) if (YARDS[k].test(x, y) && diggable(x, y)) c.push({ x, y }); return c; };
    const pick = (a) => a[(Math.random() * a.length) | 0];

    // গুপ্তধন: তালাবদ্ধ দুই উঠানের একটায়
    const tk = Math.random() < 0.5 ? 'ne' : 'sw';
    L.treasure = pick(tilesIn(tk));
    L.flags.yard = YARDS[tk].name;
    // মুদ্রা
    for (const k of ['nw', 'se', tk === 'ne' ? 'sw' : 'ne']) {
      const p = pick(tilesIn(k).filter((q) => q.x !== L.treasure.x || q.y !== L.treasure.y));
      L.objects.push({ id: `coin${k}`, kind: 'coin', x: p.x, y: p.y, w: 1, h: 1, solid: false });
    }
    // ফলক: এলোমেলো নাম আর সাল
    const plaques = L.objects.filter((o) => o.role === 'plaque');
    const names = MERCHANTS.slice().sort(() => Math.random() - 0.5);
    const years = [];
    while (years.length < plaques.length) { const y = 1885 + ((Math.random() * 25) | 0); if (!years.includes(y)) years.push(y); }
    plaques.forEach((o, i) => { o.owner = names[i]; o.year = years[i]; o.trade = TRADES[(Math.random() * TRADES.length) | 0]; });
    const ownerHouse = pick(plaques);
    L.flags.owner = ownerHouse.owner;
    L.flags.ownerSide = ownerHouse.side;
    L.flags.code = String(ownerHouse.year);
    L.flags.read = {};
  }

  const lines = (who, ...texts) => texts.map((text) => ({ who, text }));
  const ask = (who, text, choices) => ({ who, text, choices });
  const bnum = (n) => BN_DIGITS(n);

  window.LEVELS.panam = {
    digs: 5,
    build,
    setup,
    speakers: {
      majhi: { name: 'মাঝি রতন', face: '🧔🏾‍♂️' },
      rahela: { name: 'রাহেলা খালা', face: '👵🏽' },
    },
    objectives: [
      { id: 'talk', text: 'ঘাটে মাঝি রতনের সাথে কথা বলো' },
      { id: 'shovel', text: 'খোলা উঠানের মালির ঘর থেকে কোদাল নাও' },
      { id: 'bells', text: 'নাচঘরের ঘণ্টার সুর মিলিয়ে পিতলের চাবি নাও' },
      { id: 'chest', text: 'গদিঘরের সিন্দুক খোলো (মালিকের বাড়ির ফলক খোঁজো)' },
      { id: 'dig', text: 'তালাবদ্ধ উঠানে খুঁড়ে রত্নখণ্ড বের করো' },
      { id: 'kantha', text: 'বোনাস: রাহেলা খালার নকশিকাঁথা জোড়া লাগাও', optional: true },
    ],
    historyCard: 'পানাম নগর সোনারগাঁওয়ের একটি পুরনো বণিকপাড়া। প্রায় ৬০০ মিটার লম্বা এক সরু রাস্তার দুই পাশে ৫০টিরও বেশি পুরনো দালান আছে, যার বেশিরভাগ উনিশ শতকের শেষ আর বিশ শতকের শুরুতে কাপড় ও অন্যান্য ব্যবসার ধনী বণিকেরা তৈরি করেছিলেন। দালানগুলোতে ইউরোপীয় আর মুঘল স্থাপত্যের মিশ্রণ দেখা যায়, আর পুরো এলাকাটা খাল দিয়ে ঘেরা। ষোলো শতকে এই সোনারগাঁও ছিল বারো ভূঁইয়াদের নেতা ঈসা খাঁর রাজধানী।',

    onStart(api) {
      api.say(lines('narrator',
        'সোনারগাঁও, নারায়ণগঞ্জ। কচুরিপানাভরা খালের উপর কাঠের সাঁকো পেরিয়ে তুমি এলে পানাম নগরে।',
        'সরু রাস্তার দুপাশে সারি সারি পুরনো দালান। খসে পড়া রং, সবুজ খড়খড়ি, ছাদে গজিয়ে ওঠা বটের চারা… একসময় এখানে ধনী বণিকেরা থাকতেন।',
        'দালানগুলোর পেছনের উঠানে যাওয়ার গলিতে তালা ঝুলছে। ঘাটের **মাঝি** হয়তো কিছু জানেন।'));
    },

    interact: {
      async majhi(api) {
        if (!api.isDone('talk')) {
          const c = await api.say([
            ...lines('majhi',
              'আদাব! এই নৌকায় কত মানুষরে পানাম নগর দেখাইছি, গোনা যায় না।',
              'এই রাস্তার দুপাশে সব **বণিকদের বাড়ি**। কাপড়, সোনা-রুপা, লবণের কারবার করতেন। একশো বছরের বেশি পুরনো সব দালান।',
              'বাড়িগুলার পেছনে উঠান আছে, গলির দরজা দিয়া যাইতে হয়। কিন্তু কয়েকটা গলিতে **তালা** দেওয়া।'),
            ask('majhi', 'তুমিও কি ওই হারানো রত্নের খোঁজে আইছো?', ['জি, রত্নখণ্ড খুঁজতে এসেছি!', 'তালার চাবি কোথায় পাব?']),
          ]);
          await api.say(lines('majhi',
            c === 0 ? 'হা হা! ঠিক মানুষই আইছে। এই নাও আমার দাদার আমলের **কম্পাস**। ধনের কাছে গেলে গরম হইয়া ওঠে!'
              : 'চাবির কথা কই, আগে এই **কম্পাসটা** রাখো। ধনের কাছে গেলে এইটা গরম হইয়া ওঠে!',
            'শুনছি **নাচঘরে** কাঁসার ঘণ্টা আছে। সুর মিলাইতে পারলে পিতলের চাবি মিলব। আর **গদিঘরের** সিন্দুকে লোহার চাবি থাকতে পারে।',
            'কোদাল লাগলে প্রথম গলিটা খোলা, পেছনের উঠানে **মালির ঘর** আছে।'));
          api.give({ id: 'compass', icon: '🧭', name: 'পুরনো কম্পাস' });
          api.complete('talk');
          return;
        }
        const hint = !api.has('shovel') ? 'প্রথম খোলা গলিটা দিয়া পেছনের উঠানে যাও, মালির ঘরে কোদাল পাইবা।'
          : !api.isDone('bells') ? 'নাচঘরটা উত্তর পাশে, সাদা দালান, ছাদে ছোট গম্বুজ। ঘণ্টার সুর মন দিয়া শুনবা।'
          : !api.isDone('chest') ? `গদিঘরের সিন্দুক খুলতে মালিকের বাড়ির সাল লাগব। রাস্তার দুপাশের বাড়ির **ফলক** পড়ো।`
          : 'দুই চাবি দিয়া দুই উঠানের তালা খোলো। লাল বৃত্ত আর কম্পাস দেইখা খুঁড়বা।';
        const MENU = ['এখন কোথায় যাব?', 'পানাম নগরের গল্প বলুন', 'সোনারগাঁওয়ের পুরনো কথা?', 'আচ্ছা, আসি'];
        let c = await api.say([ask('majhi', 'আর কিছু জানতে চাও?', MENU)]);
        while (c !== 3 && c !== undefined) {
          const answer = [
            [hint],
            ['এই রাস্তাটা প্রায় ছয়শো মিটার লম্বা। দুপাশে পঞ্চাশটার বেশি দালান। বেশিরভাগই উনিশশো সালের আশেপাশে বানানো।',
              'ইউরোপের ধাঁচের থাম আর খিলান, সাথে আমাদের দেশি কারুকাজ। দেখো, ঢালাই লোহার রেলিং আর রঙিন খড়খড়ির জানালা!'],
            ['ষোলো শতকে এই সোনারগাঁও আছিল **ঈসা খাঁর** রাজধানী। বারো ভূঁইয়াদের নেতা, বড় সাহসী মানুষ।',
              'আর সোনারগাঁওয়ের **মসলিন** কাপড়ের নাম দুনিয়াজোড়া। লোকে কয়, এত মিহি আছিল যে একটা আংটির ভেতর দিয়া পুরা কাপড় গইলা যাইত!'],
          ][c];
          c = await api.say([...lines('majhi', ...answer), ask('majhi', 'আর কিছু?', MENU)]);
        }
        await api.say(lines('majhi', 'সাবধানে যাইও। ফিরার সময় নৌকায় উঠাইয়া দিমু!'));
      },

      async shed(api) {
        if (api.has('shovel')) { await api.say(lines('narrator', 'মালির ঘরে ভাঙা টব আর জং ধরা নিড়ানি। আর কিছু নেই।')); return; }
        await api.say(lines('narrator', 'পুরনো মালির ঘর। দরজার পাশে হেলান দিয়ে রাখা একটা **কোদাল**।'));
        api.give({ id: 'shovel', icon: '⛏', name: 'কোদাল' });
        api.complete('shovel');
        api.toast('⛏ কোদাল পেয়েছ! তালা খুলে ঠিক উঠানে গিয়ে খুঁড়তে হবে।', 3500);
      },

      async nachghar(api) {
        if (api.isDone('bells')) { await api.say(lines('narrator', 'নাচঘরের ঝাড়বাতির নিচে কাঁসার ঘণ্টাগুলো চুপচাপ ঝুলছে।')); return; }
        await api.say(lines('narrator',
          'সাদা নাচঘর। উঁচু ছাদ থেকে ভাঙা ঝাড়বাতি ঝুলছে। একসময় এখানে গান-বাজনার আসর বসত।',
          'দেয়ালে চারটা কাঁসার ঘণ্টা: **সা রে গা পা**। নিচে খোদাই: "যে আমার সুর ফিরিয়ে দেবে, তার জন্য পিতলের চাবি।"'));
        const ok = await api.bells({ hint: 'ঘণ্টাগুলো একটা সুর বাজাবে। মন দিয়ে শোনো আর দেখো, তারপর একই ক্রমে বাজাও। তিন ধাপ, প্রতিবার সুর লম্বা হবে।' });
        if (!ok) { await api.say(lines('narrator', 'ঘণ্টাগুলো নীরব হয়ে গেল। আবার চেষ্টা করা যাবে।')); return; }
        api.complete('bells');
        api.give({ id: 'brassKey', icon: '🔑', name: 'পিতলের চাবি' });
        await api.say(lines('narrator', 'শেষ সুরটা বাজতেই একটা ঘণ্টার ভেতর থেকে টুং করে পড়ল একটা **পিতলের চাবি**! উত্তর পাশের দ্বিতীয় গলির তালায় এটা লাগবে।'));
      },

      async gadighar(api) {
        if (api.isDone('chest')) { await api.say(lines('narrator', 'খালি সিন্দুক। পুরনো খাতার পাতায় শুধু টাকা-আনা-পাইয়ের হিসাব।')); return; }
        const L = api.L;
        await api.say(lines('narrator',
          'গদিঘর, যেখানে বণিকেরা হিসাবের খাতা নিয়ে বসতেন। কোণে একটা ভারী লোহার সিন্দুক, চার অঙ্কের তালা।',
          `সিন্দুকের গায়ে খোদাই: "**${L.flags.owner}**-এর সিন্দুক। আমার বাড়ি যে বছর তৈরি, সেই সালেই খুলবে।" নিচে ছোট করে লেখা: "বাড়ি রাস্তার **${L.flags.ownerSide}** পাশে।"`));
        L.flags.chestSeen = true;
        api.clue(`সিন্দুক-মালিক <b>${L.flags.owner}</b>, বাড়ি রাস্তার <b>${L.flags.ownerSide}</b> পাশে`);
        const ok = await api.lock({ code: L.flags.code, hint: `"${L.flags.owner}-এর বাড়ি তৈরির সাল"। রাস্তার ${L.flags.ownerSide} পাশের বাড়ির ফলকগুলো পড়ো।` });
        if (!ok) return;
        api.complete('chest');
        api.give({ id: 'ironKey', icon: '🗝', name: 'লোহার চাবি' });
        api.give({ id: 'map', icon: '🗺', name: 'ছেঁড়া মানচিত্র' });
        const tr = L.treasure;
        api.showCircle({ x: tr.x + Math.round((api.rand() - 0.5) * 2), y: tr.y + Math.round((api.rand() - 0.5) * 2), r: 2.4 });
        api.clue(`মানচিত্রে <b>${L.flags.yard}</b> উঠানে লাল বৃত্ত`);
        await api.say(lines('narrator', `সিন্দুকে একটা **লোহার চাবি** আর একটা ছেঁড়া মানচিত্র! মানচিত্রে **${L.flags.yard}** উঠানে লাল কালিতে বৃত্ত আঁকা।`));
      },

      async gateB(api) { await gate(api, 'gateB', 'brassKey', 'পিতলের', 'নাচঘরের ঘণ্টার সুর মেলালে এই চাবি পাওয়া যাবে।'); },
      async gateC(api) { await gate(api, 'gateC', 'ironKey', 'লোহার', 'গদিঘরের সিন্দুকে হয়তো এর চাবি আছে।'); },

      async rahela(api) {
        if (api.isDone('kantha')) { await api.say(lines('rahela', 'আমার কাঁথাটা আবার আগের মতো হইছে। তোমার অনেক ভালো হোক।')); return; }
        const c = await api.say([
          ...lines('rahela',
            'আসো, বসো। আমি রাহেলা। সারাজীবন এই তাঁতে কাপড় বুনছি আর কাঁথা সেলাই করছি।',
            'আমার নানির আমলের একটা **নকশিকাঁথা** আছিল। ইঁদুরে কাইটা টুকরা টুকরা কইরা ফালাইছে! টুকরাগুলা এলোমেলো হইয়া গেছে।'),
          ask('rahela', 'তুমি টুকরাগুলা ঠিকমতো জোড়া লাগাইয়া দিবা?', ['অবশ্যই খালা, দেখি!', 'নকশিকাঁথা কী?']),
        ]);
        if (c === 1) {
          await api.say(lines('rahela',
            'পুরান শাড়ি একটার উপর একটা রাইখা চলন ফোঁড়ে সেলাই করি, তার উপর সুই-সুতায় পদ্ম, মাছ, পাখি, কলকার নকশা। এইটাই নকশিকাঁথা।',
            'প্রত্যেকটা কাঁথায় একটা গল্প থাকে। এইবার দেখো তো জোড়া লাগাইতে পারো কিনা!'));
        }
        const ok = await api.tiles({ image: 'kantha', kicker: 'রাহেলা খালার নকশিকাঁথা', title: 'কাঁথার টুকরা জোড়া লাগাও', hint: 'টুকরায় ক্লিক করলে ৯০° ঘোরে। মাঝের পদ্মটা ঠিক আছে। চারপাশের মাছ, কলকা আর পাড় মিলিয়ে দাও।' });
        if (!ok) return;
        api.complete('kantha');
        api.flag('sightBonus', 1.6);
        api.give({ id: 'lantern', icon: '🏮', name: 'হারিকেন' });
        api.addDigs(1);
        await api.say(lines('rahela',
          'ওমা, কী সুন্দর হইছে! এই নাও আমার পুরান **হারিকেনটা**, অন্ধকারে কাজে লাগব।',
          'আর কোদালের হাতলটা শক্ত কইরা বাঁইধা দিলাম, **একবার** বেশি খুঁড়তে পারবা।'));
      },

      plaque: null, // নিচে আলাদা করে বসানো হয়
    },
  };

  async function gate(api, id, key, metal, hint) {
    if (!api.has(key)) { await api.say(lines('narrator', `গলির কাঠের দরজায় ভারী **${metal} তালা** ঝুলছে। ${hint}`)); return; }
    api.openDoor(id);
    api.take(key);
    await api.say(lines('narrator', `${metal} চাবিটা ঘোরাতেই খটাস! দরজা খুলে গেল। গলি দিয়ে পেছনের উঠানে যাওয়া যাবে।`));
  }

  // সব ফলকের বাড়ির জন্য একই ইন্টার‍্যাকশন
  async function plaque(api, o) {
    const L = api.L;
    L.flags.read[o.id] = true;
    const mine = o.owner === L.flags.owner;
    await api.say(lines('narrator', `দালানের উপরের ফলকে লেখা: "**${o.owner}**, ${o.trade} · নির্মাণ **${bnum(o.year)}** খ্রিস্টাব্দ"${mine && L.flags.chestSeen ? '। এই তো সিন্দুকের মালিকের বাড়ি!' : ''}`));
  }
  const ids = ['n0', 'n1', 'n2', 'n4', 'n5', 'n6', 's0', 's1', 's2', 's3', 's5', 's6'];
  for (const id of ids) window.LEVELS.panam.interact[id] = plaque;
  delete window.LEVELS.panam.interact.plaque;
})();
