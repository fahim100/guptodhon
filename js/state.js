// খেলার অগ্রগতি — ব্রাউজারে সেভ থাকে
(function () {
  const KEY = 'guptodhon.progress.v1';
  const fresh = () => ({ completed: [], introSeen: false });

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? Object.assign(fresh(), JSON.parse(raw)) : fresh();
    } catch (e) {
      return fresh();
    }
  }

  let data = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* প্রাইভেট মোডে সেভ হয় না */ } };

  window.GameState = {
    // কোন স্থানের কী অবস্থা: 'done' | 'open' | 'locked'
    status(site) {
      if (data.completed.includes(site.id)) return 'done';
      const idx = SITES.indexOf(site);
      if (idx === 0) return 'open';
      return data.completed.includes(SITES[idx - 1].id) ? 'open' : 'locked';
    },
    completedCount: () => data.completed.length,
    complete(site) {
      if (!data.completed.includes(site.id)) { data.completed.push(site.id); save(); }
    },
    get introSeen() { return data.introSeen; },
    markIntroSeen() { data.introSeen = true; save(); },
    reset() { data = fresh(); data.introSeen = true; save(); },
  };
})();
