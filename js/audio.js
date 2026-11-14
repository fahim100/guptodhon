// সুর, শব্দ আর কণ্ঠ — সব Web Audio দিয়ে তৈরি, কোনো অডিও ফাইল লাগে না
window.Sound = (function () {
  const KEY = 'guptodhon.audio.v1';
  const settings = Object.assign({ music: 0.55, sfx: 0.8, voice: true, muted: false }, (() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  })());
  const saveSettings = () => { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ } };

  let ctx = null, master, musicBus, sfxBus, voiceBus, ambBus, reverb, noiseBuf;
  let wantMusic = null, curMusic = null, scheduler = null;

  // ---------- শুরু ----------
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master = ctx.createGain(); master.connect(comp); comp.connect(ctx.destination);
    musicBus = ctx.createGain(); sfxBus = ctx.createGain(); voiceBus = ctx.createGain(); ambBus = ctx.createGain();
    // রিভার্ব (বড় দালানের প্রতিধ্বনি)
    reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    reverb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.32;
    reverb.connect(wet); wet.connect(master);
    for (const b of [musicBus, sfxBus, voiceBus, ambBus]) b.connect(master);
    musicBus.connect(reverb); voiceBus.connect(reverb); ambBus.connect(reverb);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    applyVolumes();
    if (wantMusic) startMusic(wantMusic);
    return true;
  }
  // প্রথম ক্লিক/কী চাপলেই শব্দ চালু (ব্রাউজারের নিয়ম)
  const unlock = () => { ensure(); };
  addEventListener('pointerdown', unlock, { capture: true });
  addEventListener('keydown', unlock, { capture: true });

  function applyVolumes() {
    if (!ctx) return;
    const m = settings.muted ? 0 : 1, t = ctx.currentTime;
    master.gain.setTargetAtTime(m, t, 0.05);
    musicBus.gain.setTargetAtTime(settings.music * 0.55, t, 0.1);
    sfxBus.gain.setTargetAtTime(settings.sfx * 0.9, t, 0.05);
    ambBus.gain.setTargetAtTime(settings.sfx * 0.45, t, 0.1);
    voiceBus.gain.setTargetAtTime(settings.voice ? settings.sfx * 0.7 + 0.15 : 0, t, 0.05);
  }

  // ---------- ছোট সাহায্যকারী ----------
  const now = () => ctx.currentTime;
  function osc(type, f, t) { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); return o; }
  function env(t, a, peak, d, bus, sustain = 0.0001) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + d);
    g.connect(bus);
    return g;
  }
  function noise(t, dur) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.start(t, Math.random() * 1.5); s.stop(t + dur); return s; }
  function filt(type, f, q = 1) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  function tone(type, f, t, a, peak, d, bus = sfxBus) { const o = osc(type, f, t), g = env(t, a, peak, d, bus); o.connect(g); o.start(t); o.stop(t + a + d + 0.05); return o; }

  // ---------- সুর: রাগভিত্তিক বাঁশি, তানপুরা আর তবলা ----------
  const SA = 146.83; // D3 = সা
  const RATIO = { S: 1, R: 9 / 8, G: 5 / 4, M: 4 / 3, P: 3 / 2, D: 5 / 3, n: 16 / 9, N: 15 / 8 };
  const fq = (n, o = 0) => SA * RATIO[n] * Math.pow(2, o);
  const SONGS = {
    // ভূপালি — শান্ত, ম্যাপের জন্য
    map: { bpm: 66, scale: [['S', 1], ['R', 1], ['G', 1], ['P', 1], ['D', 1], ['S', 2], ['R', 2], ['G', 2]], tabla: false, home: [0, 3, 5] },
    // খাম্বাজ ধাঁচ — অভিযানের জন্য, তবলাসহ
    level: { bpm: 84, scale: [['P', 0], ['D', 0], ['n', 0], ['S', 1], ['R', 1], ['G', 1], ['M', 1], ['P', 1], ['D', 1], ['n', 1], ['S', 2]], tabla: true, home: [3, 7, 10] },
  };

  function tanpura(t, f, v = 0.11) {
    const lp = filt('lowpass', 2400, 0.7);
    lp.frequency.setValueAtTime(2600, t); lp.frequency.exponentialRampToValueAtTime(600, t + 2.8);
    const g = env(t, 0.015, v, 3.2, musicBus);
    lp.connect(g);
    for (const det of [1, 1.0035, 0.998]) { const o = osc('sawtooth', f * det, t); o.connect(lp); o.start(t); o.stop(t + 3.4); }
  }

  let lastFlute = null;
  function flute(t, f, dur, v = 0.16) {
    const o = osc('sine', lastFlute || f, t);
    if (lastFlute && lastFlute !== f) o.frequency.exponentialRampToValueAtTime(f, t + 0.07);
    lastFlute = f;
    const o2 = osc('triangle', f * 2, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.07);
    g.gain.setValueAtTime(v * 0.85, t + Math.max(0.08, dur - 0.12));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.18);
    g.connect(musicBus);
    const g2 = ctx.createGain(); g2.gain.value = 0.08; o2.connect(g2); g2.connect(g);
    o.connect(g);
    if (dur > 0.4) { // কম্পন (vibrato)
      const lfo = osc('sine', 5.3, t), lg = ctx.createGain();
      lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.009, t + 0.35);
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.2);
    }
    // শ্বাসের শব্দ
    const n = noise(t, 0.25), bp = filt('bandpass', 1800, 0.8), ng = env(t, 0.03, v * 0.25, 0.2, musicBus);
    n.connect(bp); bp.connect(ng);
    o.start(t); o2.start(t); o.stop(t + dur + 0.25); o2.stop(t + dur + 0.25);
  }

  function tabla(t, bol) {
    const v = 0.22;
    if (bol === 'dha' || bol === 'ge' || bol === 'dhi') { // বাঁয়া
      const o = osc('sine', 120, t); o.frequency.exponentialRampToValueAtTime(62, t + 0.28);
      const g = env(t, 0.005, v * 1.4, 0.45, musicBus); o.connect(g); o.start(t); o.stop(t + 0.5);
    }
    if (bol === 'dha' || bol === 'na' || bol === 'dhi') { // ডাঁয়া খোলা
      const f = fq('S', 1);
      [[1, 1], [2.02, 0.35], [3.01, 0.15]].forEach(([m, a]) => { const o = osc('sine', f * m, t), g = env(t, 0.003, v * a, bol === 'dhi' ? 0.6 : 0.35, musicBus); o.connect(g); o.start(t); o.stop(t + 0.7); });
      const n = noise(t, 0.03), hp = filt('highpass', 3000), g = env(t, 0.001, v * 0.4, 0.03, musicBus); n.connect(hp); hp.connect(g);
    }
    if (bol === 'ti' || bol === 'ka') { // বন্ধ আঘাত
      const n = noise(t, 0.06), bp = filt('bandpass', bol === 'ti' ? 2200 : 1200, 2), g = env(t, 0.002, v * 0.6, 0.05, musicBus); n.connect(bp); bp.connect(g);
    }
  }
  const KEHERWA = ['dha', 'ge', 'na', 'ti', 'na', 'ka', 'dhi', 'na'];

  function makePhrase(song) {
    const sc = song.scale, out = [];
    let i = song.home[(Math.random() * song.home.length) | 0];
    const len = 4 + ((Math.random() * 5) | 0);
    for (let k = 0; k < len; k++) {
      const step = [-2, -1, -1, 1, 1, 2, 0][(Math.random() * 7) | 0];
      i = Math.max(0, Math.min(sc.length - 1, i + step));
      out.push({ n: i, b: [1, 1, 1, 2, 2, 0.5, 0.5][(Math.random() * 7) | 0] });
    }
    const end = song.home[(Math.random() * song.home.length) | 0];
    out.push({ n: end, b: 4 });
    return out;
  }

  function startMusic(name) {
    stopMusic();
    if (!name) return;
    const song = SONGS[name];
    curMusic = name;
    let beat = 0, next = now() + 0.15, phrase = null, pi = 0, wait = 4, noteLeft = 0;
    const spb = 60 / song.bpm / 2; // প্রতি অষ্টম নোট
    const drone = [['P', -1], ['S', 0], ['S', 0], ['S', -1]];
    scheduler = setInterval(() => {
      if (!ctx) return;
      while (next < now() + 0.35) {
        if (beat % 4 === 0) { const [n, o] = drone[(beat / 4) % 4]; tanpura(next, fq(n, o)); }
        if (song.tabla && beat >= 16) tabla(next, KEHERWA[beat % 8]);
        // বাঁশির সুর
        if (noteLeft > 0) noteLeft--;
        else if (wait > 0) wait--;
        else {
          if (!phrase) { phrase = makePhrase(song); pi = 0; }
          const nt = phrase[pi++];
          const [n, o] = song.scale[nt.n];
          const beats = Math.max(1, nt.b * 2);
          flute(next, fq(n, o), beats * spb * 0.95, name === 'map' ? 0.13 : 0.15);
          noteLeft = beats - 1;
          if (pi >= phrase.length) { phrase = null; wait = 6 + ((Math.random() * 10) | 0); lastFlute = null; }
        }
        beat++;
        next += spb;
      }
    }, 90);
  }
  function stopMusic() { clearInterval(scheduler); scheduler = null; curMusic = null; }

  // ---------- পরিবেশের শব্দ ----------
  let ambTimer = null, waterGain = null;
  function startAmbient() {
    stopAmbient();
    if (!ctx) return;
    // ফোয়ারার পানি
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const bp = filt('bandpass', 1300, 0.6); waterGain = ctx.createGain(); waterGain.gain.value = 0;
    s.connect(bp); bp.connect(waterGain); waterGain.connect(ambBus); s.start();
    waterGain._src = s;
    const tickAmb = () => {
      if (!ctx) return;
      const r = Math.random();
      if (r < 0.55) birds(); else if (r < 0.85) coo(); else rickshawBell();
      ambTimer = setTimeout(tickAmb, 2500 + Math.random() * 5000);
    };
    ambTimer = setTimeout(tickAmb, 1500);
  }
  function stopAmbient() {
    clearTimeout(ambTimer);
    if (waterGain) { try { waterGain._src.stop(); } catch (e) { /* ignore */ } waterGain = null; }
  }
  function birds() {
    let t = now();
    const base = 2600 + Math.random() * 1500, n = 2 + ((Math.random() * 4) | 0);
    for (let i = 0; i < n; i++) {
      const o = osc('sine', base, t);
      o.frequency.exponentialRampToValueAtTime(base * 1.35, t + 0.04);
      o.frequency.exponentialRampToValueAtTime(base * 0.9, t + 0.09);
      const g = env(t, 0.01, 0.05, 0.09, ambBus); o.connect(g); o.start(t); o.stop(t + 0.12);
      t += 0.11 + Math.random() * 0.06;
    }
  }
  function coo() { // কবুতরের বাকবাকুম
    let t = now();
    for (let i = 0; i < 3; i++) {
      const o = osc('sine', 420, t); o.frequency.exponentialRampToValueAtTime(360, t + 0.3);
      const tr = osc('sine', 18, t), tg = ctx.createGain(); tg.gain.value = 0.04; tr.connect(tg);
      const g = env(t, 0.06, 0.07, 0.3, ambBus); tg.connect(g.gain); o.connect(g);
      o.start(t); tr.start(t); o.stop(t + 0.4); tr.stop(t + 0.4);
      t += i === 0 ? 0.42 : 0.3;
    }
  }
  function rickshawBell() { // দূরে রিকশার বেল — টুং টাং
    let t = now();
    for (let r = 0; r < 2; r++) {
      for (let k = 0; k < 4; k++) {
        [[2350, 0.05], [3120, 0.03], [4870, 0.015]].forEach(([f, v]) => tone('sine', f, t, 0.002, v, 0.25, ambBus));
        t += 0.06;
      }
      t += 0.18;
    }
  }

  // ---------- শব্দ-ইফেক্ট ----------
  const SFX = {
    step(surface) {
      const t = now(), n = noise(t, 0.06);
      const f = filt(surface === 'p' ? 'bandpass' : 'lowpass', surface === 'p' ? 900 + Math.random() * 300 : 500 + Math.random() * 200, 1.2);
      const g = env(t, 0.004, surface === 'p' ? 0.09 : 0.06, 0.06, sfxBus); n.connect(f); f.connect(g);
    },
    dig() {
      const t = now();
      for (let i = 0; i < 2; i++) {
        const tt = t + i * 0.32;
        const n = noise(tt, 0.22), lp = filt('lowpass', 700), g = env(tt, 0.01, 0.35, 0.2, sfxBus); n.connect(lp); lp.connect(g);
        const o = osc('sine', 140, tt); o.frequency.exponentialRampToValueAtTime(50, tt + 0.15);
        const g2 = env(tt, 0.004, 0.4, 0.18, sfxBus); o.connect(g2); o.start(tt); o.stop(tt + 0.25);
      }
    },
    coin() { const t = now(); tone('sine', 1318.5, t, 0.003, 0.18, 0.12); tone('sine', 1975.5, t + 0.08, 0.003, 0.2, 0.5); tone('triangle', 3951, t + 0.08, 0.002, 0.04, 0.3); },
    pickup() { const t = now(); [0, 4, 7, 12].forEach((s, i) => tone('triangle', 523.25 * Math.pow(2, s / 12), t + i * 0.07, 0.005, 0.16, 0.35)); },
    right() { const t = now(); [0, 4, 7, 12, 16].forEach((s, i) => tone('sine', 440 * Math.pow(2, s / 12), t + i * 0.06, 0.005, 0.15, 0.5)); },
    wrong() { const t = now(); const o = osc('sawtooth', 180, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.35); const lp = filt('lowpass', 900); const g = env(t, 0.01, 0.13, 0.35, sfxBus); o.connect(lp); lp.connect(g); o.start(t); o.stop(t + 0.4); },
    tick() { const t = now(); const n = noise(t, 0.02), bp = filt('bandpass', 3200, 4), g = env(t, 0.001, 0.25, 0.02, sfxBus); n.connect(bp); bp.connect(g); },
    unlock() { const t = now(); SFX.tick(); const n = noise(t + 0.08, 0.08), bp = filt('bandpass', 900, 3), g = env(t + 0.08, 0.002, 0.4, 0.08, sfxBus); n.connect(bp); bp.connect(g); tone('sine', 880, t + 0.2, 0.005, 0.12, 0.6); tone('sine', 1320, t + 0.28, 0.005, 0.1, 0.7); },
    rotate() { const t = now(); const n = noise(t, 0.09), bp = filt('bandpass', 600, 1.5), g = env(t, 0.005, 0.2, 0.09, sfxBus); n.connect(bp); bp.connect(g); },
    page() { const t = now(); const n = noise(t, 0.25), hp = filt('highpass', 2500); const g = env(t, 0.06, 0.06, 0.18, sfxBus); n.connect(hp); hp.connect(g); },
    click() { tone('triangle', 660, now(), 0.002, 0.08, 0.06); },
    flap() { let t = now(); for (let i = 0; i < 6; i++) { const n = noise(t, 0.05), bp = filt('bandpass', 700 + Math.random() * 300, 1), g = env(t, 0.005, 0.12, 0.05, sfxBus); n.connect(bp); bp.connect(g); t += 0.07; } },
    whoosh() { const t = now(); const n = noise(t, 0.6), bp = filt('bandpass', 400, 0.8); bp.frequency.exponentialRampToValueAtTime(2400, t + 0.5); const g = env(t, 0.25, 0.18, 0.35, sfxBus); n.connect(bp); bp.connect(g); },
    chest() {
      const t = now();
      const o = osc('sawtooth', 70, t), lp = filt('lowpass', 300), g = env(t, 0.05, 0.25, 0.8, sfxBus); o.connect(lp); lp.connect(g); o.start(t); o.stop(t + 1);
      const notes = [0, 4, 7, 12, 7, 12, 16, 19, 24];
      notes.forEach((s, i) => { tone('triangle', 293.66 * Math.pow(2, s / 12), t + 1.1 + i * 0.09, 0.005, 0.17, i === notes.length - 1 ? 1.6 : 0.4); });
      for (let i = 0; i < 14; i++) tone('sine', 2000 + Math.random() * 3000, t + 1.2 + Math.random() * 1.4, 0.002, 0.04, 0.25);
    },
    fail() { const t = now(); [7, 5, 3, 0].forEach((s, i) => tone('triangle', 220 * Math.pow(2, s / 12), t + i * 0.22, 0.01, 0.15, 0.45)); },
    push() { // ভারী পাথর ঘষটে সরানো
      const t = now(); const n = noise(t, 0.3), lp = filt('lowpass', 500, 2); lp.frequency.linearRampToValueAtTime(260, t + 0.28);
      const g = env(t, 0.03, 0.45, 0.26, sfxBus); n.connect(lp); lp.connect(g);
      const o = osc('sine', 70, t), g2 = env(t, 0.02, 0.2, 0.25, sfxBus); o.connect(g2); o.start(t); o.stop(t + 0.3);
    },
    rumble() { // পাথরের দরজা খোলা
      const t = now(); const n = noise(t, 1.4), lp = filt('lowpass', 300, 1.5); const g = env(t, 0.2, 0.5, 1.2, sfxBus); n.connect(lp); lp.connect(g);
      const o = osc('sawtooth', 45, t), lp2 = filt('lowpass', 150), g2 = env(t, 0.2, 0.25, 1.2, sfxBus); o.connect(lp2); lp2.connect(g2); o.start(t); o.stop(t + 1.5);
    },
    roar() { // বাঘের গর্জন
      const t = now();
      const o = osc('sawtooth', 95, t); o.frequency.linearRampToValueAtTime(130, t + 0.25); o.frequency.exponentialRampToValueAtTime(55, t + 1.3);
      const lfo = osc('sine', 22, t), lg = ctx.createGain(); lg.gain.value = 18; lfo.connect(lg); lg.connect(o.frequency);
      const lp = filt('lowpass', 700, 2), g = env(t, 0.12, 0.45, 1.2, sfxBus);
      o.connect(lp); lp.connect(g); o.start(t); lfo.start(t); o.stop(t + 1.5); lfo.stop(t + 1.5);
      const n = noise(t, 1.2), bp = filt('bandpass', 400, 1), g2 = env(t, 0.1, 0.25, 1.1, sfxBus); n.connect(bp); bp.connect(g2);
    },
    whistle() { // বনরক্ষীর বাঁশি
      const t = now();
      for (const [d, f] of [[0, 2600], [0.32, 2600]]) { const o = osc('sine', f, t + d), tr = osc('sine', 30, t + d), tg = ctx.createGain(); tg.gain.value = 120; tr.connect(tg); tg.connect(o.frequency); const g = env(t + d, 0.01, 0.16, 0.26, sfxBus); o.connect(g); o.start(t + d); tr.start(t + d); o.stop(t + d + 0.3); tr.stop(t + d + 0.3); }
    },
    shutter() { // ক্যামেরার ক্লিক
      const t = now();
      for (const d of [0, 0.07]) { const n = noise(t + d, 0.03), bp = filt('bandpass', 2500, 2), g = env(t + d, 0.001, 0.35, 0.03, sfxBus); n.connect(bp); bp.connect(g); }
      tone('sine', 1760, t + 0.15, 0.003, 0.08, 0.15);
    },
    splash() {
      const t = now(); const n = noise(t, 0.5), lp = filt('lowpass', 1800); lp.frequency.exponentialRampToValueAtTime(400, t + 0.45);
      const g = env(t, 0.01, 0.4, 0.45, sfxBus); n.connect(lp); lp.connect(g);
      const o = osc('sine', 220, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.2); const g2 = env(t, 0.005, 0.25, 0.2, sfxBus); o.connect(g2); o.start(t); o.stop(t + 0.25);
    },
    // কাঁসার ঘণ্টা: সা রে গা পা
    bell(i) {
      const t = now(), f = fq(['S', 'R', 'G', 'P'][i], 2);
      [[1, 0.2, 1.8], [2.76, 0.07, 0.9], [5.4, 0.04, 0.5], [8.93, 0.02, 0.3]].forEach(([m, v, d]) => tone('sine', f * m, t, 0.002, v, d));
      const n = noise(t, 0.02), hp = filt('highpass', 4000), g = env(t, 0.001, 0.12, 0.02, sfxBus); n.connect(hp); hp.connect(g);
    },
    star(i) { tone('sine', 880 * Math.pow(2, [0, 4, 7][i] / 12), now(), 0.003, 0.18, 0.5); },
  };

  // ---------- কণ্ঠ ----------
  // বাংলা TTS থাকলে সেটা, না থাকলে স্বরধ্বনি মেনে তৈরি "চরিত্র-কণ্ঠ"
  let bnVoice = null;
  function findVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    bnVoice = vs.find((v) => /^bn(-|_|$)/i.test(v.lang)) || null;
  }
  if ('speechSynthesis' in window) { findVoice(); speechSynthesis.onvoiceschanged = findVoice; }

  const VOICES = {
    chowkidar: { f0: 108, speed: 0.92, rate: 0.88, pitch: 0.75, glide: -0.12 },
    mithu: { f0: 300, speed: 1.15, rate: 1.05, pitch: 1.5, glide: 0.1 },
    narrator: { f0: 0, speed: 1, rate: 0.95, pitch: 1, whisper: true },
    player: { f0: 170, speed: 1, rate: 1, pitch: 1.1, glide: 0 },
    majhi: { f0: 125, speed: 1, rate: 0.95, pitch: 0.85, glide: 0.08 },
    rahela: { f0: 225, speed: 0.95, rate: 0.9, pitch: 1.25, glide: -0.08 },
    nasrin: { f0: 215, speed: 1.05, rate: 1, pitch: 1.2, glide: 0.05 },
    monk: { f0: 135, speed: 0.85, rate: 0.85, pitch: 0.9, glide: -0.04 },
    khadem: { f0: 112, speed: 0.9, rate: 0.88, pitch: 0.8, glide: -0.1 },
    teacher: { f0: 235, speed: 1.05, rate: 1, pitch: 1.3, glide: 0.06 },
    ranger: { f0: 140, speed: 1.05, rate: 1, pitch: 0.95, glide: 0.04 },
    mouyal: { f0: 118, speed: 0.95, rate: 0.9, pitch: 0.82, glide: 0.1 },
    guide: { f0: 150, speed: 1.08, rate: 1, pitch: 1, glide: 0.05 },
    nani: { f0: 205, speed: 0.85, rate: 0.85, pitch: 1.15, glide: -0.12 },
  };
  const FORMANT = { a: [730, 1090], e: [530, 1840], i: [300, 2290], o: [570, 840], u: [320, 870], O: [640, 1000] };
  const SIGN = { 'া': 'a', 'ি': 'i', 'ী': 'i', 'ু': 'u', 'ূ': 'u', 'ৃ': 'i', 'ে': 'e', 'ৈ': 'O', 'ো': 'o', 'ৌ': 'O' };
  const INDEP = { 'অ': 'O', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u', 'ঊ': 'u', 'এ': 'e', 'ঐ': 'O', 'ও': 'o', 'ঔ': 'O' };
  let lastSyl = 0;

  function syllable(vowel, who) {
    const p = VOICES[who] || VOICES.narrator, t = now();
    const dur = (0.07 + Math.random() * 0.04) / p.speed;
    const scale = p.f0 > 220 ? 1.25 : 1;
    const [F1, F2] = FORMANT[vowel].map((f) => f * scale);
    const out = env(t, 0.012, p.whisper ? 0.5 : 0.32, dur, voiceBus);
    let src;
    if (p.whisper) src = noise(t, dur + 0.05);
    else {
      src = osc('sawtooth', p.f0 * (0.93 + Math.random() * 0.14), t);
      src.frequency.linearRampToValueAtTime(p.f0 * (1 + (p.glide || 0) * Math.random()), t + dur);
      src.start(t); src.stop(t + dur + 0.05);
    }
    for (const [F, gain, q] of [[F1, 1, 9], [F2, 0.55, 12]]) { const b = filt('bandpass', F, q), g = ctx.createGain(); g.gain.value = gain * (p.whisper ? 1.4 : 3); src.connect(b); b.connect(g); g.connect(out); }
  }

  const Voice = {
    // পুরো লাইন শুরু হলে
    line(text, who) {
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      if (!settings.voice || settings.muted || !bnVoice) return;
      const u = new SpeechSynthesisUtterance(text.replace(/\*\*/g, ''));
      const p = VOICES[who] || VOICES.narrator;
      u.voice = bnVoice; u.lang = bnVoice.lang; u.rate = p.rate; u.pitch = p.pitch;
      u.volume = Math.min(1, settings.sfx + 0.2);
      speechSynthesis.speak(u);
    },
    // টাইপরাইটারে প্রতিটা নতুন অক্ষর এলে
    char(text, i, who) {
      if (!ctx || !settings.voice || settings.muted || bnVoice) return;
      const c = text[i];
      let v = INDEP[c];
      const code = c.charCodeAt(0);
      const isCons = (code >= 0x0995 && code <= 0x09B9) || (code >= 0x09DC && code <= 0x09DF);
      if (!v && isCons) {
        const nx = text[i + 1];
        if (nx === '্') return; // যুক্তবর্ণ
        v = SIGN[nx] || 'O';
      }
      if (!v) return;
      const t = performance.now();
      const p = VOICES[who] || VOICES.narrator;
      if (t - lastSyl < 62 / p.speed) return;
      lastSyl = t;
      syllable(v, who);
    },
    stop() { if ('speechSynthesis' in window) speechSynthesis.cancel(); },
    get mode() { return bnVoice ? 'tts' : 'synth'; },
  };

  return {
    ensure,
    settings,
    set(k, v) { settings[k] = v; saveSettings(); applyVolumes(); if (k === 'voice' && !v) Voice.stop(); },
    toggleMute() { settings.muted = !settings.muted; saveSettings(); applyVolumes(); if (settings.muted) Voice.stop(); return settings.muted; },
    music(name) { wantMusic = name; if (!ctx) return; if (curMusic !== name) startMusic(name); },
    ambient(on) { if (!ctx) return; if (on) startAmbient(); else stopAmbient(); },
    water(v) { if (waterGain) waterGain.gain.setTargetAtTime(v * 0.18, now(), 0.3); },
    sfx(name, ...a) { if (!ctx || settings.muted) return; const f = SFX[name]; if (f) try { f(...a); } catch (e) { /* ignore */ } },
    voice: Voice,
  };
})();
