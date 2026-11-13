// গেমের UI: HUD, তথ্য প্যানেল, কাহিনি, টোস্ট
(function () {
  const $ = (id) => document.getElementById(id);
  const panel = $('panel');
  let current = null;

  // ---------- HUD ----------
  const GEM_SVG = (got) => `
    <svg viewBox="-12 -29 24 28" class="${got ? 'got-static' : ''}">
      <path d="M-11,-21 L-6,-28 L6,-28 L11,-21 L0,-3 Z" fill="${got ? 'url(#hud-gold)' : 'rgba(255,255,255,.06)'}"
        stroke="${got ? '#7a4a08' : 'rgba(242,193,78,.45)'}" stroke-width="1.4" stroke-linejoin="round"/>
      ${got ? '<path d="M-6,-27 L-3,-21 L-9,-21 Z" fill="#fff" fill-opacity=".55"/>' : ''}
    </svg>`;

  function renderHud(justGot) {
    const n = GameState.completedCount();
    const total = SITES.length;
    $('gems').innerHTML =
      `<svg width="0" height="0" style="position:absolute"><defs><linearGradient id="hud-gold" x1="0" y1="0" x2=".4" y2="1">
        <stop offset="0" stop-color="#fff4c2"/><stop offset=".45" stop-color="#f2c14e"/><stop offset="1" stop-color="#b8740f"/>
      </linearGradient></defs></svg>` +
      SITES.map((s, i) => GEM_SVG(i < n)).join('');
    if (justGot) {
      const el = $('gems').querySelectorAll('svg')[n]; // প্রথম svg টা defs-এর
      if (el) el.classList.add('got');
    }
    $('gem-count').textContent = `রত্নখণ্ড ${BN_DIGITS(n)}/${BN_DIGITS(total)}`;
  }

  // ---------- প্যানেল ----------
  function openPanel(site) {
    current = site;
    const st = GameState.status(site);
    const order = SITES.indexOf(site) + 1;
    panel.classList.toggle('is-locked', st === 'locked');
    panel.classList.toggle('is-final', !!site.final && st !== 'locked');
    $('p-order').textContent = st === 'done' ? '✓' : BN_DIGITS(order);
    $('p-era').textContent = site.era;
    $('p-name').textContent = site.name;
    $('p-district').textContent = site.district;
    $('p-diff').textContent = '★'.repeat(site.difficulty) + '☆'.repeat(5 - site.difficulty);
    $('p-desc').textContent = site.desc;
    $('p-quest').textContent = st === 'locked' ? 'এই স্থানের রহস্য এখনো তালাবদ্ধ। আগের স্থানের রত্নখণ্ড খুঁজে পেলে এখানে আসার সূত্র মিলবে।' : site.quest;

    const status = $('p-status');
    status.className = st;
    status.textContent =
      st === 'done' ? '✓ এই স্থানের রত্নখণ্ড তোমার সংগ্রহে আছে' :
      st === 'locked' ? `🔒 আগে "${SITES[order - 2].name}" জয় করো` : '';

    $('btn-play').disabled = st === 'locked';
    $('btn-play').textContent = st === 'done' ? 'আবার খেলো' : site.final ? 'গোপন কক্ষে প্রবেশ করো' : 'অভিযান শুরু করো';
    // যে স্থানের লেভেল এখনো বানানো হয়নি, সেখানে ডেমো বোতাম থাকবে
    $('btn-demo-win').style.display = st === 'open' && !LevelGame.has(site.id) ? '' : 'none';

    panel.classList.add('open');
    Sound.sfx('page');
    panel.setAttribute('aria-hidden', 'false');
    panel.scrollTop = 0;
    WorldMap.select(site.id);
    WorldMap.focusSite(site);
  }

  function closePanel(resetZoom = true) {
    if (!panel.classList.contains('open')) return;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    current = null;
    WorldMap.select(null);
    if (resetZoom) WorldMap.resetView();
  }

  // ---------- টোস্ট ----------
  let toastTimer;
  function toast(html, ms = 3200) {
    const t = $('toast');
    t.innerHTML = html;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  // ---------- লেভেল জেতা (ডেমো) ----------
  async function winLevel(site) {
    const idx = SITES.indexOf(site);
    const pos = WorldMap.screenPos(site);
    closePanel(false);
    GameState.complete(site);
    WorldMap.refresh();
    FX.burst(pos[0], pos[1] - 16, 90);
    Sound.sfx('pickup');
    renderHud(true);

    if (site.final) {
      toast('🏆 অভিনন্দন! তুমি বাংলার হারানো <b>রাজকোষ</b> খুঁজে পেয়েছ!', 6000);
      setTimeout(() => FX.burst(innerWidth / 2, innerHeight / 2, 160), 500);
      return;
    }

    toast(`💎 <b>${site.name}</b>-এর রত্নখণ্ড পাওয়া গেছে!`);
    const next = SITES[idx + 1];
    WorldMap.resetView();
    await new Promise((r) => setTimeout(r, 900));
    Sound.sfx('whoosh');
    await WorldMap.animateRoute(idx);
    const np = WorldMap.screenPos(next);
    FX.burst(np[0], np[1] - 16, 40);
    Sound.sfx('unlock');
    toast(`🗺 নতুন গন্তব্য উন্মুক্ত: <b>${next.name}</b>`);
  }

  // ---------- ইভেন্ট ----------
  WorldMap.init({
    onSelect(site) {
      if (GameState.status(site) === 'locked') WorldMap.shake(site);
      openPanel(site);
    },
    onBackground() { closePanel(); },
  });
  renderHud();

  panel.querySelector('.panel-close').addEventListener('click', () => closePanel());
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('level').classList.contains('show')) closePanel(); });

  // কালি-পর্দা দিয়ে দৃশ্য বদল
  function inkWipe(mid) {
    const w = $('wipe');
    w.classList.add('cover');
    setTimeout(() => {
      mid();
      setTimeout(() => w.classList.remove('cover'), 120);
    }, 600);
  }

  $('btn-play').addEventListener('click', () => {
    if (!current) return;
    const site = current;
    if (!LevelGame.has(site.id)) {
      toast(`⛏ <b>${site.name}</b>-এর লেভেল এখনো তৈরি হচ্ছে। আপাতত নিচের ডেমো বোতাম দিয়ে জয় দেখো।`, 4200);
      return;
    }
    inkWipe(() => {
      closePanel(false);
      LevelGame.start(site, {
        onWin(s) {
          inkWipe(() => {
            WorldMap.resetView();
            if (GameState.status(s) === 'done') toast(`🏅 <b>${s.name}</b> আবার জয় করলে!`);
            else setTimeout(() => winLevel(s), 500);
          });
        },
        onExit() { inkWipe(() => WorldMap.resetView()); },
      });
    });
  });
  $('btn-demo-win').addEventListener('click', () => { if (current) winLevel(current); });

  const intro = $('intro');
  $('btn-start').addEventListener('click', () => {
    intro.classList.remove('show');
    GameState.markIntroSeen();
    Sound.ensure();
    Sound.sfx('right');
    setTimeout(() => toast('শুরু করো <b>লালবাগ কেল্লা</b> থেকে, ঝলমলে রত্নচিহ্নে ক্লিক করো ✨', 4000), 400);
  });
  $('btn-story').addEventListener('click', () => intro.classList.add('show'));
  $('btn-reset').addEventListener('click', () => {
    if (!confirm('সব অগ্রগতি মুছে নতুন করে শুরু করবে?')) return;
    GameState.reset();
    closePanel();
    WorldMap.refresh();
    renderHud();
    toast('নতুন অভিযান শুরু হলো!');
  });
  if (!GameState.introSeen) intro.classList.add('show');

  // ---------- শব্দ ও সেটিংস ----------
  Sound.music('map'); // প্রথম ক্লিকের পর বাজবে
  const settingsEl = $('settings');
  function syncSettings() {
    const s = Sound.settings;
    $('set-music').value = s.music;
    $('set-sfx').value = s.sfx;
    $('set-voice').checked = s.voice;
    $('set-mute').checked = s.muted;
    $('set-voice-note').textContent = Sound.voice.mode === 'tts'
      ? 'এই ডিভাইসে বাংলা কণ্ঠ পাওয়া গেছে, তাই চরিত্রেরা সংলাপ পড়ে শোনাবে।'
      : 'এই ব্রাউজারে বাংলা কণ্ঠ (TTS) নেই, তাই চরিত্রেরা নিজস্ব সুরেলা "চরিত্র-কণ্ঠে" কথা বলবে।';
  }
  document.querySelectorAll('[data-open-settings]').forEach((b) => b.addEventListener('click', () => {
    Sound.ensure(); Sound.sfx('click'); syncSettings(); settingsEl.classList.add('show');
  }));
  $('set-close').addEventListener('click', () => { settingsEl.classList.remove('show'); Sound.sfx('click'); });
  settingsEl.addEventListener('click', (e) => { if (e.target === settingsEl) settingsEl.classList.remove('show'); });
  $('set-music').addEventListener('input', (e) => Sound.set('music', +e.target.value));
  $('set-sfx').addEventListener('input', (e) => { Sound.set('sfx', +e.target.value); });
  $('set-sfx').addEventListener('change', () => Sound.sfx('coin'));
  $('set-voice').addEventListener('change', (e) => Sound.set('voice', e.target.checked));
  $('set-mute').addEventListener('change', (e) => { if (e.target.checked !== Sound.settings.muted) Sound.toggleMute(); });
  addEventListener('keydown', (e) => {
    if (e.code !== 'KeyM' || e.target.matches('input, textarea')) return;
    const m = Sound.toggleMute();
    const msg = m ? '🔇 শব্দ বন্ধ (M চাপলে আবার চালু)' : '🔊 শব্দ চালু';
    if ($('level').classList.contains('show')) { const t = $('lv-toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1600); }
    else toast(msg, 1600);
  });
})();
