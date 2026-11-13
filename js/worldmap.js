// বাংলাদেশের আসল মানচিত্র — ওভারওয়ার্ল্ড
(function () {
  const svg = d3.select('#map');
  const tooltip = document.getElementById('tooltip');
  const LAND_TONES = ['#eddcb2', '#e8d3a3', '#f0e1bb', '#e6cf9e', '#ebd7aa', '#eedcb0', '#e4cc98', '#efdeb6'];

  let W, H, projection, geoPath;
  let transform = d3.zoomIdentity;
  let opts = { onSelect() {}, onBackground() {} };
  let selectedId = null;
  let animating = null; // { index, t } — যে রুটটা আঁকা হচ্ছে

  const defs = svg.append('defs');
  const zoomG = svg.append('g').attr('class', 'zoom-layer');
  const overlay = svg.append('g').attr('class', 'overlay');
  const routeG = overlay.append('g');
  const siteG = overlay.append('g');
  const compassG = overlay.append('g').attr('class', 'compass').attr('pointer-events', 'none');

  // জেলা → বিভাগ (কেন্দ্রবিন্দু কোন বিভাগে পড়ে)
  const districts = BD_MAP.districts.features;
  const divisions = BD_MAP.divisions.features;
  districts.forEach((d) => {
    const c = d3.geoCentroid(d);
    const div = divisions.find((v) => d3.geoContains(v, c));
    d.properties.division = div ? div.properties.bn : '';
    d.properties.tone = LAND_TONES[div ? divisions.indexOf(div) % LAND_TONES.length : 0];
  });

  // ---------- টেক্সচার ও ফিল্টার ----------
  function paperTexture() {
    const s = 256;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d');
    const img = g.createImageData(s, s);
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = 110; img.data[i + 1] = 70; img.data[i + 2] = 25;
      img.data[i + 3] = Math.random() < 0.5 ? Math.random() * 26 : 0;
    }
    g.putImageData(img, 0, 0);
    for (let k = 0; k < 16; k++) {
      const x = Math.random() * s, y = Math.random() * s, r = 18 + Math.random() * 70;
      for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) {
        const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
        gr.addColorStop(0, `rgba(140,90,30,${0.05 + Math.random() * 0.06})`);
        gr.addColorStop(1, 'rgba(140,90,30,0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, s, s);
      }
    }
    g.strokeStyle = 'rgba(120,80,30,0.08)';
    for (let k = 0; k < 40; k++) {
      const x = Math.random() * s, y = Math.random() * s, a = Math.random() * Math.PI;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12); g.stroke();
    }
    return c.toDataURL();
  }

  function buildDefs() {
    defs.html('');
    defs.append('pattern').attr('id', 'paper').attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 256).attr('height', 256)
      .append('image').attr('href', paperTexture()).attr('width', 256).attr('height', 256);

    // দূরের দেশের জন্য গাঢ় টেক্সচার
    const p2 = defs.append('pattern').attr('id', 'hatch').attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 8).attr('height', 8).attr('patternTransform', 'rotate(35)');
    p2.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 8)
      .attr('stroke', '#9cc7bf').attr('stroke-opacity', 0.07).attr('stroke-width', 2);

    const sh = defs.append('filter').attr('id', 'land-shadow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    sh.append('feGaussianBlur').attr('stdDeviation', 9);

    const blur = defs.append('filter').attr('id', 'soft').attr('x', '-10%').attr('y', '-10%').attr('width', '120%').attr('height', '120%');
    blur.append('feGaussianBlur').attr('stdDeviation', 5);

    // হাতে আঁকা কালির রেখা
    const rough = defs.append('filter').attr('id', 'ink');
    rough.append('feTurbulence').attr('type', 'fractalNoise').attr('baseFrequency', 0.9).attr('numOctaves', 2).attr('result', 'n');
    rough.append('feDisplacementMap').attr('in', 'SourceGraphic').attr('in2', 'n').attr('scale', 1.6);

    const glow = defs.append('filter').attr('id', 'gem-glow').attr('x', '-100%').attr('y', '-100%').attr('width', '300%').attr('height', '300%');
    glow.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', 3.5).attr('result', 'b');
    const m = glow.append('feMerge');
    m.append('feMergeNode').attr('in', 'b');
    m.append('feMergeNode').attr('in', 'SourceGraphic');

    const gold = defs.append('linearGradient').attr('id', 'g-gold').attr('x1', 0).attr('y1', 0).attr('x2', 0.4).attr('y2', 1);
    gold.append('stop').attr('offset', '0%').attr('stop-color', '#fff4c2');
    gold.append('stop').attr('offset', '45%').attr('stop-color', '#f2c14e');
    gold.append('stop').attr('offset', '100%').attr('stop-color', '#b8740f');

    const stone = defs.append('radialGradient').attr('id', 'g-stone').attr('cx', '35%').attr('cy', '30%');
    stone.append('stop').attr('offset', '0%').attr('stop-color', '#b3a690');
    stone.append('stop').attr('offset', '100%').attr('stop-color', '#5f5243');

    const ruby = defs.append('radialGradient').attr('id', 'g-ruby').attr('cx', '35%').attr('cy', '30%');
    ruby.append('stop').attr('offset', '0%').attr('stop-color', '#ffb3a1');
    ruby.append('stop').attr('offset', '55%').attr('stop-color', '#c8402a');
    ruby.append('stop').attr('offset', '100%').attr('stop-color', '#6e170b');

    defs.append('clipPath').attr('id', 'bd-clip')
      .selectAll('path').data(divisions).join('path').attr('d', geoPath);
  }

  // ---------- মানচিত্র আঁকা ----------
  function layout() {
    W = innerWidth; H = innerHeight;
    const mobile = W < 760;
    const top = mobile ? 116 : 92;
    const pad = mobile ? 18 : 40;
    projection = d3.geoMercator().fitExtent([[pad, top], [W - pad, H - pad - 14]], BD_MAP.divisions);
    geoPath = d3.geoPath(projection);
  }

  function drawMap() {
    zoomG.selectAll('*').remove();
    buildDefs();

    zoomG.append('path').attr('class', 'graticule')
      .attr('d', geoPath(d3.geoGraticule().extent([[80, 15], [100, 32]]).step([1, 1])()))
      .attr('vector-effect', 'non-scaling-stroke');

    // উপকূলের ঢেউয়ের রেখা (পুরনো মানচিত্রের মতো)
    const all = NEIGHBORS.features.concat(divisions);
    const halo = zoomG.append('g');
    [[34, 0.06], [22, 0.1], [12, 0.18], [5, 0.35]].forEach(([w, o]) => {
      halo.append('g').selectAll('path').data(all).join('path')
        .attr('class', 'coast-halo').attr('d', geoPath)
        .attr('stroke-width', w).attr('stroke-opacity', o);
    });

    // প্রতিবেশী দেশ
    zoomG.append('g').selectAll('path').data(NEIGHBORS.features).join('path')
      .attr('d', geoPath).attr('fill', '#3c5546').attr('stroke', '#3c5546').attr('stroke-width', 3);
    zoomG.append('g').selectAll('path').data(NEIGHBORS.features).join('path')
      .attr('d', geoPath).attr('fill', 'url(#hatch)');

    // বাংলাদেশের ছায়া
    zoomG.append('g').attr('filter', 'url(#land-shadow)').attr('transform', 'translate(0,6)')
      .selectAll('path').data(divisions).join('path').attr('d', geoPath).attr('fill', 'rgba(0,0,0,.55)');

    // জেলা
    zoomG.append('g').selectAll('path').data(districts).join('path')
      .attr('class', 'district').attr('d', geoPath)
      .attr('fill', (d) => d.properties.tone)
      .attr('vector-effect', 'non-scaling-stroke')
      .on('mousemove', (ev, d) => showTip(ev, `<b>${d.properties.bn}</b><small>${d.properties.division} বিভাগ</small>`))
      .on('mouseleave', hideTip)
      .on('click', () => opts.onBackground());

    // কাগজের টেক্সচার আর পোড়া কিনারা
    const tex = zoomG.append('g').attr('clip-path', 'url(#bd-clip)').attr('pointer-events', 'none');
    const [[x0, y0], [x1, y1]] = geoPath.bounds(BD_MAP.divisions);
    tex.append('rect').attr('x', x0 - 20).attr('y', y0 - 20).attr('width', x1 - x0 + 40).attr('height', y1 - y0 + 40)
      .attr('fill', 'url(#paper)');
    tex.append('g').attr('filter', 'url(#soft)').selectAll('path').data(divisions).join('path')
      .attr('d', geoPath).attr('fill', 'none').attr('stroke', '#8a5a20').attr('stroke-opacity', 0.35).attr('stroke-width', 16);

    // নদী
    const rivers = zoomG.append('g').attr('pointer-events', 'none').attr('clip-path', 'url(#bd-clip)');
    rivers.selectAll('.river-glow').data(BD_RIVERS.features).join('path')
      .attr('class', 'river-glow').attr('d', geoPath).attr('stroke-width', 5).attr('vector-effect', 'non-scaling-stroke');
    rivers.selectAll('.river').data(BD_RIVERS.features).join('path')
      .attr('class', 'river').attr('d', geoPath)
      .attr('stroke-width', (d) => (d.properties.rank <= 3 ? 2.4 : 1.6)).attr('vector-effect', 'non-scaling-stroke');

    // বিভাগের সীমানা আর দেশের রেখা
    zoomG.append('g').attr('pointer-events', 'none').selectAll('path').data(divisions).join('path')
      .attr('class', 'division-border').attr('d', geoPath).attr('vector-effect', 'non-scaling-stroke');
    zoomG.append('g').attr('class', 'ink-outline').attr('pointer-events', 'none').attr('filter', 'url(#ink)').selectAll('path').data(divisions).join('path')
      .attr('class', 'country-outline').attr('d', geoPath).attr('vector-effect', 'non-scaling-stroke');

    // লেবেল
    const labels = zoomG.append('g').attr('class', 'labels');
    const text = (cls, lonlat, str) => {
      const [x, y] = projection(lonlat);
      return labels.append('text').attr('class', cls).attr('x', x).attr('y', y).text(str);
    };
    text('sea-label', [90.0, 20.95], 'বঙ্গোপসাগর');
    text('neighbor-label', [87.75, 23.7], 'ভারত');
    text('neighbor-label', [91.4, 25.75], 'ভারত');
    text('neighbor-label', [92.0, 23.35], 'ভারত');
    text('neighbor-label', [93.1, 21.6], 'মিয়ানমার');
    text('neighbor-label', [90.5, 27.35], 'ভুটান');

    labels.selectAll('.div-label').data(divisions).join('text')
      .attr('class', 'map-label div-label')
      .attr('x', (d) => geoPath.centroid(d)[0]).attr('y', (d) => geoPath.centroid(d)[1])
      .text((d) => d.properties.bn);

    labels.selectAll('.dist-label').data(districts).join('text')
      .attr('class', 'map-label dist-label')
      .attr('x', (d) => geoPath.centroid(d)[0]).attr('y', (d) => geoPath.centroid(d)[1])
      .attr('opacity', 0).text((d) => d.properties.bn);

    const riverSpots = { Ganges: [89.55, 23.83], Brahmaputra: [89.78, 24.55], Tista: [89.3, 25.88] };
    labels.selectAll('.river-label').data(BD_RIVERS.features.filter((f) => riverSpots[f.properties.en])).join('text')
      .attr('class', 'river-label')
      .attr('x', (d) => projection(riverSpots[d.properties.en])[0] + 6)
      .attr('y', (d) => projection(riverSpots[d.properties.en])[1])
      .text((d) => d.properties.bn + ' নদী');

    drawCompass();
  }

  function drawCompass() {
    compassG.selectAll('*').remove();
    const mobile = W < 760;
    const r = mobile ? 30 : 44;
    const cx = mobile ? r + 16 : r + 40;
    const cy = H - r - (mobile ? 24 : 46);
    const g = compassG.attr('transform', `translate(${cx},${cy})`).attr('opacity', 0.85);
    g.append('circle').attr('r', r * 1.05).attr('fill', 'none').attr('stroke', '#e8d6a8').attr('stroke-opacity', 0.4);
    g.append('circle').attr('r', r * 0.86).attr('fill', 'none').attr('stroke', '#e8d6a8').attr('stroke-opacity', 0.25).attr('stroke-dasharray', '2 3');
    for (let i = 0; i < 8; i++) {
      const long = i % 2 === 0;
      const len = long ? r : r * 0.55;
      const w = long ? r * 0.16 : r * 0.11;
      const a = (i * Math.PI) / 4;
      const tip = [Math.sin(a) * len, -Math.cos(a) * len];
      const l = [Math.sin(a - Math.PI / 2) * w, -Math.cos(a - Math.PI / 2) * w];
      const rr = [Math.sin(a + Math.PI / 2) * w, -Math.cos(a + Math.PI / 2) * w];
      g.append('path').attr('d', `M0,0L${l}L${tip}Z`).attr('fill', i === 0 ? '#c8402a' : '#e8d6a8').attr('fill-opacity', long ? 0.95 : 0.6);
      g.append('path').attr('d', `M0,0L${rr}L${tip}Z`).attr('fill', i === 0 ? '#7e1f10' : '#8f7a52').attr('fill-opacity', long ? 0.95 : 0.6);
    }
    g.append('circle').attr('r', r * 0.08).attr('fill', '#f2c14e');
    g.append('text').attr('y', -r - 8).attr('text-anchor', 'middle').attr('fill', '#f3e2b5')
      .attr('font-family', 'Tiro Bangla, serif').attr('font-size', mobile ? 12 : 15).text('উ');
  }

  // ---------- রুট ----------
  function bezier(a, b, i) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const bend = (i % 2 ? -1 : 1) * 0.22;
    return { p0: a, c: [a[0] + dx / 2 - dy * bend, a[1] + dy / 2 + dx * bend], p1: b };
  }
  function partial({ p0, c, p1 }, t) {
    const q = [p0[0] + (c[0] - p0[0]) * t, p0[1] + (c[1] - p0[1]) * t];
    const r = [c[0] + (p1[0] - c[0]) * t, c[1] + (p1[1] - c[1]) * t];
    const e = [q[0] + (r[0] - q[0]) * t, q[1] + (r[1] - q[1]) * t];
    return { d: `M${p0}Q${q} ${e}`, head: e };
  }

  const screen = (s) => transform.apply(projection([s.lon, s.lat]));

  function drawRoutes() {
    const segs = [];
    for (let i = 0; i < SITES.length - 1; i++) {
      const a = SITES[i], b = SITES[i + 1];
      const done = GameState.status(a) === 'done';
      let t = 1;
      if (animating && animating.index === i) t = animating.t;
      else if (!done) t = 0;
      segs.push({ i, curve: bezier(screen(a), screen(b), i), t });
    }
    routeG.selectAll('.route-future').data(segs).join('path')
      .attr('class', 'route-future')
      .attr('d', (s) => partial(s.curve, 1).d);
    routeG.selectAll('.route').data(segs.filter((s) => s.t > 0), (s) => s.i).join('path')
      .attr('class', 'route')
      .attr('d', (s) => partial(s.curve, s.t).d);
    const heads = animating ? segs.filter((s) => s.i === animating.index && s.t < 1) : [];
    routeG.selectAll('.route-head').data(heads).join('circle')
      .attr('class', 'route-head').attr('r', 5).attr('fill', '#a8321e')
      .attr('stroke', '#f6e7c1').attr('stroke-width', 2)
      .attr('cx', (s) => partial(s.curve, s.t).head[0]).attr('cy', (s) => partial(s.curve, s.t).head[1]);
  }

  // ---------- মার্কার ----------
  function gemPath() {
    return 'M-11,-21 L-6,-28 L6,-28 L11,-21 L0,-3 Z';
  }

  function buildMarker(g, site) {
    const st = GameState.status(site);
    const order = SITES.indexOf(site) + 1;
    g.selectAll('*').remove();
    g.attr('class', `site ${st}${site.final ? ' final' : ''}${selectedId === site.id ? ' selected' : ''}`);

    g.append('circle').attr('class', 'hit').attr('r', 26).attr('cy', -14);
    g.append('ellipse').attr('class', 'shadow').attr('rx', 10).attr('ry', 3.5).attr('cy', 1);
    if (st === 'open') g.append('circle').attr('class', 'pulse').attr('r', 16).attr('cy', -16);

    const body = g.append('g').attr('class', 'body');
    if (st === 'locked') {
      body.append('circle').attr('r', 12).attr('cy', -16).attr('fill', site.final ? 'url(#g-ruby)' : 'url(#g-stone)')
        .attr('stroke', '#3a2d20').attr('stroke-width', 1.5).attr('opacity', site.final ? 0.85 : 1);
      // তালা
      body.append('path').attr('d', 'M-3.6,-18 v-3 a3.6,3.6 0 0 1 7.2,0 v3').attr('fill', 'none')
        .attr('stroke', '#f1e6d2').attr('stroke-width', 1.8);
      body.append('rect').attr('x', -5).attr('y', -18.5).attr('width', 10).attr('height', 8).attr('rx', 1.5).attr('fill', '#f1e6d2');
      body.append('circle').attr('cy', -14.8).attr('r', 1.3).attr('fill', '#5f5243');
    } else if (site.final && st === 'open') {
      // গুপ্তধনের সিন্দুক
      const c = body.append('g').attr('filter', 'url(#gem-glow)');
      c.append('rect').attr('x', -13).attr('y', -20).attr('width', 26).attr('height', 15).attr('rx', 2).attr('fill', '#7a4318').attr('stroke', '#3b1f08');
      c.append('path').attr('d', 'M-13,-20 a13,7 0 0 1 26,0 z').attr('fill', '#9a5a22').attr('stroke', '#3b1f08');
      c.append('rect').attr('x', -13).attr('y', -15).attr('width', 26).attr('height', 3).attr('fill', 'url(#g-gold)');
      c.append('rect').attr('x', -3).attr('y', -18).attr('width', 6).attr('height', 7).attr('rx', 1).attr('fill', 'url(#g-gold)');
    } else {
      const gem = body.append('g').attr('filter', st === 'open' ? 'url(#gem-glow)' : null);
      gem.append('path').attr('d', gemPath()).attr('fill', 'url(#g-gold)').attr('stroke', '#7a4a08').attr('stroke-width', 1.2).attr('stroke-linejoin', 'round');
      gem.append('path').attr('d', 'M-11,-21 H11 M-6,-28 L-3,-21 L0,-3 M6,-28 L3,-21 L0,-3 M-3,-21 L0,-28 L3,-21')
        .attr('fill', 'none').attr('stroke', '#7a4a08').attr('stroke-opacity', 0.55).attr('stroke-width', 0.8);
      gem.append('path').attr('d', 'M-6,-27 L-3,-21 L-9,-21 Z').attr('fill', '#fff').attr('fill-opacity', 0.55);
    }

    // নম্বর ব্যাজ
    const badgeFill = st === 'done' ? '#2f8f6b' : st === 'open' ? '#a8321e' : '#6e6050';
    body.append('circle').attr('cx', 12).attr('cy', -29).attr('r', 7.5).attr('fill', badgeFill).attr('stroke', '#f6ead0').attr('stroke-width', 1.5);
    body.append('text').attr('class', 'num').attr('x', 12).attr('y', -28.5).attr('fill', '#fff')
      .text(st === 'done' ? '✓' : BN_DIGITS(order));

    // নাম
    const pos = site.label || 'right';
    const anchor = pos === 'left' ? 'end' : pos === 'right' ? 'start' : 'middle';
    const lx = pos === 'left' ? -18 : pos === 'right' ? 22 : 0;
    const ly = pos === 'bottom' ? 18 : pos === 'top' ? -58 : -16;
    const t = g.append('text').attr('class', 'label').attr('text-anchor', anchor).attr('x', lx).attr('y', ly);
    t.append('tspan').text(site.name);
    t.append('tspan').attr('class', 'label-sub').attr('x', lx).attr('dy', 14).text(st === 'locked' ? 'তালাবদ্ধ' : site.district);
  }

  function drawSites() {
    siteG.selectAll('g.site-wrap').data(SITES, (d) => d.id).join((enter) => {
      const wrap = enter.append('g').attr('class', 'site-wrap');
      wrap.append('g');
      wrap.on('click', (ev, d) => { ev.stopPropagation(); opts.onSelect(d); })
        .on('mousemove', (ev, d) => {
          const st = GameState.status(d);
          const msg = st === 'done' ? '✓ রত্নখণ্ড সংগ্রহ হয়েছে' : st === 'open' ? 'ক্লিক করে অভিযান দেখো' : 'আগের স্থান জয় করলে খুলবে';
          showTip(ev, `<b>${d.name}</b><small>${msg}</small>`);
        })
        .on('mouseleave', hideTip);
      return wrap;
    }).each(function (d) { buildMarker(d3.select(this).select('g'), d); });
    positionSites();
  }

  function positionSites() {
    siteG.selectAll('g.site-wrap').attr('transform', (d) => `translate(${screen(d)})`);
  }

  // ---------- জুম ----------
  const zoom = d3.zoom().scaleExtent([1, 7]).on('zoom', (ev) => {
    transform = ev.transform;
    zoomG.attr('transform', transform);
    const k = transform.k;
    // CSS-এর font-size কে ছাপিয়ে যেতে style() ব্যবহার
    const near = k >= 2;
    zoomG.selectAll('.div-label').style('font-size', `${13 / k}px`).style('stroke-width', `${3 / k}px`).style('opacity', near ? 0 : 1);
    zoomG.selectAll('.dist-label').style('font-size', `${11.5 / k}px`).style('stroke-width', `${3 / k}px`).style('opacity', near ? 0.8 : 0);
    zoomG.selectAll('.river-label').style('font-size', `${11.5 / k}px`).style('stroke-width', `${3 / k}px`);
    zoomG.selectAll('.sea-label').style('font-size', `${22 / Math.sqrt(k)}px`);
    zoomG.selectAll('.neighbor-label').style('font-size', `${15 / Math.sqrt(k)}px`);
    zoomG.select('.ink-outline').attr('filter', k > 1.5 ? null : 'url(#ink)');
    positionSites();
    drawRoutes();
    hideTip();
  });
  svg.call(zoom).on('dblclick.zoom', null);
  svg.on('click', (ev) => { if (ev.target === svg.node()) opts.onBackground(); });

  function focusSite(site, k = 2.4) {
    const [x, y] = projection([site.lon, site.lat]);
    const mobile = W < 760;
    const cx = mobile ? W / 2 : (W - 420) / 2;
    const cy = mobile ? (H * 0.38 + 120) / 2 : H / 2;
    svg.transition().duration(900).ease(d3.easeCubicInOut)
      .call(zoom.transform, d3.zoomIdentity.translate(cx, cy).scale(k).translate(-x, -y));
  }
  function resetView() {
    svg.transition().duration(800).ease(d3.easeCubicInOut).call(zoom.transform, d3.zoomIdentity);
  }

  // ---------- টুলটিপ ----------
  function showTip(ev, html) {
    tooltip.innerHTML = html;
    tooltip.style.left = ev.clientX + 'px';
    tooltip.style.top = ev.clientY + 'px';
    tooltip.style.opacity = 1;
  }
  function hideTip() { tooltip.style.opacity = 0; }

  // ---------- পাবলিক ----------
  function render() {
    if (innerWidth < 50 || innerHeight < 50) return; // লুকানো ট্যাবে আকার শূন্য থাকে
    layout();
    drawMap();
    svg.call(zoom.transform, d3.zoomIdentity);
    drawSites();
    drawRoutes();
  }

  let resizeTimer;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(render, 150); });

  window.WorldMap = {
    init(o) { opts = Object.assign(opts, o); render(); },
    refresh() { drawSites(); drawRoutes(); },
    select(id) { selectedId = id; drawSites(); },
    focusSite,
    resetView,
    screenPos: screen,
    shake(site) {
      const n = siteG.selectAll('g.site-wrap').filter((d) => d.id === site.id).select('g');
      n.classed('shake', false); void n.node().getBBox(); n.classed('shake', true);
    },
    // আগের স্থান থেকে পরের স্থানে লাল কালির পথ এঁকে নতুন স্থান খোলা
    animateRoute(index) {
      return new Promise((resolve) => {
        animating = { index, t: 0 };
        const dur = 1600;
        const timer = d3.timer((el) => {
          animating.t = d3.easeCubicInOut(Math.min(1, el / dur));
          drawRoutes();
          if (el >= dur) {
            timer.stop();
            animating = null;
            drawRoutes();
            const next = SITES[index + 1];
            drawSites();
            siteG.selectAll('g.site-wrap').filter((d) => d.id === next.id).select('g').classed('unlocking', true);
            resolve();
          }
        });
      });
    },
  };
})();
