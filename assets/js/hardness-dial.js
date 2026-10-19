/* ==========================================================================
   HARDNESS DIAL: postcode input → animated SVG gauge
   ========================================================================== */
(function () {
  const data = HWS.hardnessData;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const CX = 160, CY = 170, R = 130, STROKE = 22;

  const svg = document.getElementById('hardness-dial');
  const form = document.getElementById('postcode-form');
  const input = document.getElementById('postcode-input');
  const hint = document.getElementById('postcode-hint');
  const valueEl = document.getElementById('dial-value');
  const resultEl = document.getElementById('dial-result');
  const statsEl = document.getElementById('dial-stats');
  const ctaEl = document.getElementById('dial-cta');
  const legendEl = document.getElementById('hardness-legend');
  const sodiumPanel = document.getElementById('sodium-panel');
  if (!svg || !form) return;

  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  // ---------- Geometry ----------
  const point = (value, radius = R) => {
    const t = (Math.min(value, data.dialMax) / data.dialMax) * Math.PI;
    return [CX - radius * Math.cos(t), CY - radius * Math.sin(t)];
  };
  const arcPath = (from, to) => {
    const [x1, y1] = point(from);
    const [x2, y2] = point(to);
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };
  const el = (tag, attrs) => {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  };

  // ---------- Build dial ----------
  const segments = [];
  let lower = 0;
  data.bands.forEach((band, i) => {
    const upper = Math.min(band.max, data.dialMax);
    const gap = i === data.bands.length - 1 ? 0 : 1.5;
    const path = el('path', {
      d: arcPath(lower, upper - gap),
      stroke: cssVar(band.color),
      'stroke-width': STROKE,
      fill: 'none',
      'stroke-linecap': i === 0 || i === data.bands.length - 1 ? 'round' : 'butt',
      class: 'dial-seg',
    });
    path.style.transition = 'opacity .4s';
    svg.appendChild(path);
    segments.push(path);
    lower = upper;
  });

  for (let v = 0; v <= data.dialMax; v += 100) {
    const [x, y] = point(v, R + STROKE + 6);
    const label = el('text', { x, y: y + 4, 'text-anchor': v === 0 ? 'end' : v === data.dialMax ? 'start' : 'middle', class: 'dial-tick-label' });
    label.textContent = v;
    svg.appendChild(label);
  }

  const needle = el('g', { class: 'dial-needle' });
  needle.appendChild(el('path', { d: `M ${CX} ${CY - 5} L ${CX - R + 26} ${CY} L ${CX} ${CY + 5} Z`, fill: cssVar('--color-ink') }));
  needle.appendChild(el('circle', { cx: CX, cy: CY, r: 12, fill: cssVar('--color-ink') }));
  needle.appendChild(el('circle', { cx: CX, cy: CY, r: 4, fill: '#fff' }));
  svg.appendChild(needle);

  // ---------- Legend ----------
  let prev = 0;
  data.bands.forEach((band) => {
    const li = document.createElement('li');
    const range = band.max === Infinity ? `${prev}+` : `${prev}–${band.max}`;
    li.innerHTML = `<span class="swatch"></span>${band.label} <small>${range}</small>`;
    li.style.setProperty('--band', `var(${band.color})`);
    legendEl.appendChild(li);
    prev = band.max + 1;
  });

  // ---------- Postcode parsing ----------
  function parsePostcode(raw) {
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let outcode = null, formatted = null;
    const full = clean.match(/^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/);
    if (full) { outcode = full[1]; formatted = `${full[1]} ${full[2]}`; }
    else if (/^[A-Z]{1,2}\d[A-Z\d]?$/.test(clean)) { outcode = clean; formatted = clean; }
    if (!outcode) return null;
    return { outcode, formatted, area: outcode.match(/^[A-Z]+/)[0] };
  }

  function lookup(pc) {
    return data.districts[pc.outcode] || data.areas[pc.area] || null;
  }

  const bandFor = (mgl) => data.bands.findIndex((b) => mgl <= b.max);

  // ---------- Render ----------
  let countFrame;
  function animateValue(to) {
    cancelAnimationFrame(countFrame);
    const from = parseInt(valueEl.textContent, 10) || 0;
    const start = performance.now();
    const dur = 1400;
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      valueEl.textContent = Math.round(from + (to - from) * eased);
      if (p < 1) countFrame = requestAnimationFrame(step);
    };
    countFrame = requestAnimationFrame(step);
  }

  function setNeedle(mgl) {
    const deg = (Math.min(mgl, data.dialMax) / data.dialMax) * 180;
    needle.style.transform = `rotate(${deg}deg)`;
  }

  function highlight(index) {
    segments.forEach((s, i) => (s.style.opacity = index === -1 || i === index ? 1 : 0.25));
    legendEl.querySelectorAll('li').forEach((li, i) => li.classList.toggle('is-active', i === index));
  }

  // ---------- Sodium ----------
  const SODIUM_BAR_MAX = 250; // mg/l shown across the full bar width

  function sodiumFor(entry) {
    const cfg = data.sodium;
    const incoming = entry.sodium ?? 0;
    const added = Math.round(entry.mgl * cfg.perHardness);
    const total = incoming + added;
    const status = total > cfg.limit ? 'over' : total > cfg.closeThreshold ? 'close' : 'ok';
    return { incoming, added, total, status };
  }

  // Estimates only: based on typical (placeholder) area figures, not supplier data.
  const VERDICTS = {
    over: 'Fully softened, your water could <strong>exceed the 200 mg/l</strong> drinking limit. We\'d recommend a blended supply, plus a hard-water drinking tap or an RO unit in the kitchen.',
    close: 'Fully softened, your water would be <strong>close to the 200 mg/l</strong> drinking limit. We\'d fit a hard-water drinking tap or RO unit for drinking and baby feeds.',
    ok: 'Softened water should stay <strong>within the 200 mg/l</strong> limit. We still recommend a hard-water drinking tap, especially for making up baby formula.',
  };

  function renderSodium(na) {
    const pct = (v) => `${Math.min((v / SODIUM_BAR_MAX) * 100, 100)}%`;
    sodiumPanel.hidden = false;
    sodiumPanel.classList.toggle('is-over', na.status === 'over');
    sodiumPanel.classList.toggle('is-close', na.status === 'close');
    sodiumPanel.querySelector('.sodium-limit').style.left = pct(data.sodium.limit);
    const addedFill = document.getElementById('sodium-fill-added');
    const incomingFill = document.getElementById('sodium-fill-incoming');
    incomingFill.style.width = '0'; addedFill.style.width = '0';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      incomingFill.style.width = pct(na.incoming);
      addedFill.style.width = pct(Math.min(na.added, SODIUM_BAR_MAX - na.incoming));
    }));
    document.getElementById('sodium-incoming').textContent = `≈ ${na.incoming} mg/l`;
    document.getElementById('sodium-added').textContent = `+${na.added} mg/l`;
    document.getElementById('sodium-total').textContent = `≈ ${na.total} mg/l`;
    document.getElementById('sodium-verdict').innerHTML = VERDICTS[na.status];
    document.getElementById('sodium-bar-label').setAttribute('aria-label',
      `Estimated softened sodium ${na.total} mg/l against a 200 mg/l limit`);
  }

  function showResult(pc, entry) {
    const idx = bandFor(entry.mgl);
    const band = data.bands[idx];
    setNeedle(entry.mgl);
    animateValue(entry.mgl);
    highlight(idx);

    resultEl.innerHTML = `
      <span class="dial-result-rating" style="background:var(${band.color})">${band.label}</span>
      <p class="dial-result-text"><strong>${pc.formatted}</strong> · ${band.text}</p>
      <p class="dial-result-note">Approximate figure, typical for ${entry.name}. Check with your water supplier for an exact reading.</p>`;
    document.getElementById('stat-clark').textContent = (entry.mgl / 14.3).toFixed(1) + '°';
    document.getElementById('stat-dh').textContent = (entry.mgl / 17.8).toFixed(1) + '°';
    document.getElementById('stat-area').textContent = entry.name;
    statsEl.hidden = false;
    ctaEl.hidden = false;
    ctaEl.textContent = `Get a softener quote for ${pc.outcode}`;

    const na = sodiumFor(entry);
    renderSodium(na);

    HWS.state = { ...(HWS.state || {}), hardness: { postcode: pc.formatted, mgl: entry.mgl, band: band.label, sodiumSoftened: na.total } };
    document.dispatchEvent(new CustomEvent('hws:hardness', { detail: HWS.state.hardness }));
  }

  function showError(msg) {
    hint.textContent = msg;
    hint.classList.add('is-error');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    hint.textContent = '';
    hint.classList.remove('is-error');

    const pc = parsePostcode(input.value);
    if (!pc) return showError('Please enter a UK postcode, or just the first part, e.g. W4.');

    const entry = lookup(pc);
    if (!entry) {
      setNeedle(0); animateValue(0); highlight(-1);
      statsEl.hidden = true; sodiumPanel.hidden = true; ctaEl.hidden = false;
      ctaEl.textContent = 'Ask us about your area';
      resultEl.innerHTML = `<p class="dial-result-label">${pc.formatted} is outside our main coverage area, but get in touch and we'll let you know if we can help.</p>`;
      return;
    }
    input.value = pc.formatted;
    showResult(pc, entry);
  });

  // Prefill the contact form when the CTA is clicked
  ctaEl.addEventListener('click', () => {
    const h = HWS.state && HWS.state.hardness;
    const postcode = h ? h.postcode : (parsePostcode(input.value) || {}).formatted;
    HWS.prefillContact && HWS.prefillContact({ postcode, interest: 'water-softener' });
  });

  setNeedle(0);

  // Area list buttons (#coverage) run the checker and scroll up to the dial
  document.querySelectorAll('[data-check-postcode]').forEach((btn) => btn.addEventListener('click', () => {
    input.value = btn.dataset.checkPostcode;
    document.getElementById('hardness').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => form.requestSubmit(), 450);
  }));

  // Shareable links: ?postcode=SW11 runs the check on load (handy for ads / emails)
  const preset = new URLSearchParams(location.search).get('postcode');
  if (preset) {
    input.value = preset;
    form.requestSubmit();
  }
})();
