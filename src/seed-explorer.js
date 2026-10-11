import './seed-explorer.css';
import { VERSIONS, LIMIT, TILE, parseSeed, randomSeed, sampling, clampView, worldAt, zoomAt, visibleTiles, tileKey, TileCache } from './explorer-core.js';
import { BIOMES, biomeName, colourize } from './biome-palette.js';
import { ExplorerPool } from './explorer-pool.js';
import { icon } from './explorer-icons.js';
import { createExport } from './explorer-export.js';

const copy = {
  de: { intro: 'Entdecke die Biome deiner Welt.', seed: 'Seed', random: 'Zufälliger Seed', version: 'Minecraft Java Version', settings: 'Welteinstellungen', standard: 'Standard', large: 'Große Biome', generate: 'Karte generieren', slice: 'Overworld · Biomschnitt bei Y=64 · X/Z: −10.000 bis +10.000', loading: 'Biomgenerator wird geladen …', calculating: 'Karte wird generiert…', ready: 'Karte bereit', error: 'Der Biomgenerator konnte nicht geladen werden oder die Berechnung ist fehlgeschlagen.', retry: 'Erneut versuchen', seedError: 'Bitte eine ganze Zahl zwischen −9223372036854775808 und 9223372036854775807 eingeben.', reset: 'Zurück zu 0/0', zoomIn: 'Vergrößern', zoomOut: 'Verkleinern', map: 'Interaktive Biomkarte', legend: 'Biomlegende', detail: 'Detail', blocks: 'Blöcke', licence: 'Generator & Lizenzen', source: 'Versionsanpassungen', by: 'von', spawn: 'Geschätzter Weltspawn', spawnNote: 'Spawn geschätzt; kann vom Minecraft-Weltspawn abweichen.', download: 'Ausschnitt herunterladen', exportView: 'Sichtbarer Ausschnitt', exportFormat: 'WebP / JPEG · automatisch kleinere Datei · Originalauflösung', exporting: 'Bild wird erstellt…', exportError: 'Der Export ist fehlgeschlagen. Bitte erneut versuchen.', close: 'Schließen', cancel: 'Abbrechen' },
  en: { intro: 'Explore the biomes of your world.', seed: 'Seed', random: 'Random seed', version: 'Minecraft Java version', settings: 'World settings', standard: 'Default', large: 'Large Biomes', generate: 'Generate map', slice: 'Overworld · Biome slice at Y=64 · X/Z: −10,000 to +10,000', loading: 'Loading biome generator …', calculating: 'Generating map…', ready: 'Map ready', error: 'The biome generator could not be loaded or generation failed.', retry: 'Try again', seedError: 'Enter an integer between −9223372036854775808 and 9223372036854775807.', reset: 'Return to 0/0', zoomIn: 'Zoom in', zoomOut: 'Zoom out', map: 'Interactive biome map', legend: 'Biome legend', detail: 'Detail', blocks: 'blocks', licence: 'Generator & licences', source: 'Version adaptations', by: 'by', spawn: 'Estimated world spawn', spawnNote: 'Estimated spawn; may differ from the Minecraft world spawn.', download: 'Download visible area', exportView: 'Visible area', exportFormat: 'WebP / JPEG · automatically selects the smaller file · original resolution', exporting: 'Creating image…', exportError: 'Export failed. Please try again.', close: 'Close', cancel: 'Cancel' },
};

export function createSeedExplorer(container) {
  container.innerHTML = `<section class="explorer" aria-labelledby="explorer-title">
    <div class="explorer-heading"><div class="explorer-heading-main"><span class="explorer-heading-icon">${icon('map')}</span><div><h1 id="explorer-title">Seed Explorer</h1><p data-explorer-text="intro"></p></div></div><span class="explorer-badge">${icon('version')}Java Edition</span></div>
    <form class="explorer-form" novalidate>
      <div class="seed-field"><label for="explorer-seed" class="explorer-field-label">${icon('seed')}<span data-explorer-text="seed"></span></label><div class="seed-input-row"><input id="explorer-seed" name="seed" type="text" inputmode="text" autocomplete="off" spellcheck="false" placeholder="123456789" aria-describedby="seed-error"><button class="explorer-icon-button" type="button" data-action="random" data-explorer-label="random">${icon('dice')}</button></div></div>
      <label><span class="explorer-field-label">${icon('version')}<span data-explorer-text="version"></span></span><span class="explorer-select"><select name="version">${[...VERSIONS].reverse().map(v => `<option>${v}</option>`).join('')}</select>${icon('chevron', 'explorer-select-chevron')}</span></label>
      <label><span class="explorer-field-label">${icon('settings')}<span data-explorer-text="settings"></span></span><span class="explorer-select"><select name="settings"><option value="standard" data-explorer-text="standard"></option><option value="large" data-explorer-text="large"></option></select>${icon('chevron', 'explorer-select-chevron')}</span></label>
      <button class="explorer-primary" type="submit">${icon('map')}<span data-explorer-text="generate"></span></button>
      <p id="seed-error" class="explorer-error" role="alert" hidden></p>
    </form>
    <p class="explorer-caption">${icon('info')}<span data-explorer-text="slice"></span></p>
    <div class="explorer-map-wrap" data-empty>
      <canvas class="explorer-map" tabindex="-1" aria-disabled="true" data-explorer-label="map"></canvas>
      <div class="explorer-placeholder"><div class="explorer-placeholder-content"><span class="explorer-status" role="status" aria-live="polite"></span><progress max="1" data-explorer-label="calculating" hidden></progress><button type="button" data-action="retry" hidden>${icon('refresh')}<span data-explorer-text="retry"></span></button></div></div>
      <div class="explorer-map-buttons" hidden><button class="explorer-icon-button" type="button" data-action="in" data-explorer-label="zoomIn">${icon('plus')}</button><button class="explorer-icon-button" type="button" data-action="out" data-explorer-label="zoomOut">${icon('minus')}</button><button class="explorer-icon-button" type="button" data-action="reset" data-explorer-label="reset">${icon('reset')}</button></div>
      <div class="explorer-scale" hidden></div><div class="explorer-map-activity" role="status" aria-live="polite" hidden></div><span class="explorer-detail" hidden></span><span class="explorer-spawn" role="img" hidden><svg width="36" height="44" viewBox="0 0 36 44" aria-hidden="true"><path d="M18 44C15 36 3 27 3 17a15 15 0 0 1 30 0c0 10-12 19-15 27Z"/><circle cx="18" cy="17" r="5" fill="white" stroke="none"/></svg></span>
    </div>
    <div class="explorer-attribution">Generator: <a href="https://github.com/Cubitect/cubiomes" target="_blank" rel="noopener">Cubiomes</a> <span data-explorer-text="by"></span> Cubitect · <span data-explorer-text="source"></span>: <a href="https://github.com/fwsoapy/seedforge" target="_blank" rel="noopener">SeedForge</a> <span data-explorer-text="by"></span> fwsoapy · <a href="/wasm/LICENSES.txt" target="_blank" rel="noopener" data-explorer-text="licence"></a></div>
    <div class="explorer-map-footer">
      <div class="explorer-readouts"><span class="explorer-position-chip">${icon('pin')}<output class="explorer-position">X: 0 · Z: 0</output></span><span class="explorer-biome-chip" hidden>${icon('seed')}<output class="explorer-biome"></output></span></div>
      <button type="button" data-action="download" disabled>${icon('download')}<span data-explorer-text="download"></span></button>
    </div>
    <p class="explorer-spawn-note" data-explorer-text="spawnNote" hidden></p>
    <details class="explorer-legend"><summary>${icon('palette')}<span data-explorer-text="legend"></span>${icon('chevron', 'explorer-legend-chevron')}</summary><div></div></details>

  </section>`;
  const root = container.querySelector('.explorer');
  const form = root.querySelector('.explorer-form');
  const canvas = root.querySelector('canvas');
  const context = canvas.getContext('2d', { alpha: false });
  const status = root.querySelector('.explorer-status');
  const progress = root.querySelector('progress');
  const placeholder = root.querySelector('.explorer-placeholder');
  const cache = new TileCache();
  const overview = new TileCache(4 * 1024 * 1024);
  const cleanup = new AbortController();
  let language = 'en', config = null, pool = null, view = { x: 0, z: 0, bpp: 4 }, width = 1, height = 1;
  let frame = 0, disposed = false, initialized = false, error = false, readyCount = 0, pointTimer = 0, pointId = 0, selected = null;
  let state = 'empty', revealed = false, spawn = null, generation = 0;
  const exporter = createExport(root, t, listen, () => ({ config: { ...config }, view: { ...view }, width, height, scale: sampling(view.bpp), generation }));
  const pointers = new Map();
  function t(key) { return copy[language][key]; }
  function listen(element, event, handler, options = {}) { element.addEventListener(event, handler, { ...options, signal: cleanup.signal }); }
  function refreshLanguage() {
    language = document.documentElement.lang === 'de' ? 'de' : 'en';
    root.querySelectorAll('[data-explorer-text]').forEach(el => { el.textContent = t(el.dataset.explorerText); });
    root.querySelectorAll('[data-explorer-label]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.explorerLabel)); if (el.matches('button')) el.title = t(el.dataset.explorerLabel); });
    const list = root.querySelector('.explorer-legend div');
    list.replaceChildren(...[...BIOMES.values()].filter(b => !config || config.version === '26.3' || b.id !== 188).filter(b => !config || !config.version.startsWith('26.1') || b.id !== 187).map(b => {
      const item = document.createElement('span'); const swatch = document.createElement('i'); swatch.style.background = b.color; item.append(swatch, b[language]); return item;
    }));
    if (!root.querySelector('#seed-error').hidden) root.querySelector('#seed-error').textContent = t('seedError');
    exporter.refresh(); updateBiom(); schedule();
  }
  function updateBiom() { root.querySelector('.explorer-biome').textContent = selected?.biome != null ? biomeName(selected.biome, language) : ''; root.querySelector('.explorer-biome-chip').hidden = selected?.biome == null; }
  function schedule() { if (!disposed && !frame) frame = requestAnimationFrame(draw); }
  function setFailure() {
    error = true; state = 'error'; pool?.dispose(); pool = null; revealed = false;
    setInteractive(false); root.querySelector('[data-action="retry"]').hidden = false; schedule();
  }
  function setInteractive(enabled) {
    placeholder.hidden = enabled;
    root.querySelector('.explorer-map-wrap').toggleAttribute('data-empty', !enabled);
    root.querySelector('.explorer-map-wrap').setAttribute('aria-busy', String(!enabled && !!config && !error));
    root.querySelector('.explorer-map-buttons').hidden = !enabled;
    root.querySelector('.explorer-scale').hidden = !enabled;
    root.querySelector('.explorer-detail').hidden = !enabled;
    root.querySelector('.explorer-spawn-note').hidden = !enabled;
    root.querySelectorAll('[data-action="download"]').forEach(el => { el.disabled = !enabled; });
    canvas.tabIndex = enabled ? 0 : -1; canvas.setAttribute('aria-disabled', String(!enabled));
  }
  function entryFor(tile) { return (tile.scale === 64 ? overview : cache).get(tileKey(config, tile.scale, tile.tx, tile.tz)); }
  function allOverview() { return visibleTiles({ x: 0, z: 0, bpp: 20000 }, 1, 1, 64); }
  function onResult(data) {
    if (disposed || error) return;
    if (data.type === 'ready') { readyCount++; initialized = readyCount === pool.slots.length; if (initialized) pool.spawn(); schedule(); return; }
    if (data.type === 'spawn') { spawn = { x: data.x, z: data.z }; schedule(); return; }
    if (data.type === 'point') {
      if (data.id !== pointId) return;
      selected = { x: data.x, z: data.z, biome: data.biome }; updateBiom(); return;
    }
    if (data.type === 'tile') {
      const image = document.createElement('canvas'); image.width = image.height = TILE;
      image.getContext('2d').putImageData(new ImageData(colourize(data.ids), TILE, TILE), 0, 0);
      (data.scale === 64 ? overview : cache).set(data.key, { ...data, image, bytes: data.ids.byteLength + TILE * TILE * 4 }); schedule();
    }
  }
  function generate(event) {
    event?.preventDefault();
    const seedError = root.querySelector('#seed-error');
    let seed;
    try { seed = parseSeed(form.elements.seed.value); } catch {
      seedError.hidden = false; seedError.textContent = t('seedError'); form.elements.seed.setAttribute('aria-invalid', 'true'); form.elements.seed.focus(); return;
    }
    seedError.hidden = true; form.elements.seed.removeAttribute('aria-invalid'); form.elements.seed.value = seed;
    config = { seed, version: form.elements.version.value, large: form.elements.settings.value === 'large' };
    generation++; exporter.close(); revealed = false; spawn = null; pointers.clear();
    pool?.dispose(); cache.clear(); overview.clear(); selected = null; pointId = 0; clearTimeout(pointTimer); initialized = false; readyCount = 0; error = false; state = 'loading';
    root.querySelector('[data-action="retry"]').hidden = true; setInteractive(false);
    const pin = root.querySelector('.explorer-spawn'); pin.hidden = true; pin.classList.remove('is-dropping');
    view = clampView({ x: 0, z: 0, bpp: 4096 / width }, width, height);
    try {
      pool = new ExplorerPool((navigator.hardwareConcurrency || 2) <= 2 ? 1 : 2, () => new Worker(new URL('./biome-worker.js', import.meta.url), { type: 'module' }), onResult, setFailure);
      pool.configure(config);
    } catch { setFailure(); }
    refreshLanguage(); schedule();
  }
  function draw() {
    frame = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.fillStyle = '#0d151d'; context.fillRect(0, 0, width, height); context.imageSmoothingEnabled = false;
    const scale = sampling(view.bpp);
    // Paint coarse cached coverage first and progressively overlay finer tiles.
    if (config && !error) for (const level of [64, 16, 4, 1].filter(level => level >= scale)) {
      for (const tile of visibleTiles(view, width, height, level)) {
        const entry = entryFor(tile); if (!entry) continue;
        const span = TILE * level;
        const x = (tile.tx * span - view.x) / view.bpp + width / 2, y = (tile.tz * span - view.z) / view.bpp + height / 2;
        context.save();
        const left = (-LIMIT - view.x) / view.bpp + width / 2, top = (-LIMIT - view.z) / view.bpp + height / 2;
        context.beginPath(); context.rect(left, top, 2 * LIMIT / view.bpp, 2 * LIMIT / view.bpp); context.clip();
        context.drawImage(entry.image, x, y, span / view.bpp, span / view.bpp); context.restore();
      }
    }
    if (config && initialized && !error) {
      const visible = visibleTiles(view, width, height, scale);
      const required = revealed ? visible : [...new Map([...allOverview(), ...visible].map(tile => [tileKey(config, tile.scale, tile.tx, tile.tz), tile])).values()];
      const remaining = required.filter(tile => !entryFor(tile));
      const desired = revealed ? visibleTiles(view, width, height, scale, 1).filter(tile => !entryFor(tile)) : remaining;
      pool.replaceTiles(desired.map(tile => ({ ...tile, key: tileKey(config, tile.scale, tile.tx, tile.tz) })));
      const total = required.length + (revealed ? 0 : 1);
      progress.value = (required.length - remaining.length + (!revealed && spawn ? 1 : 0)) / total;
      if (!revealed && !remaining.length && spawn) {
        revealed = true; setInteractive(true);
        const pin = root.querySelector('.explorer-spawn'); pin.hidden = false;
        pin.classList.add('is-dropping');
      }
      state = remaining.length || !revealed ? 'calculating' : 'ready';
      status.textContent = revealed ? t('ready') : `${t('calculating')} ${Math.round(progress.value * 100)}%`;
    } else status.textContent = config ? t(state === 'loading' ? 'calculating' : state) : '';
    root.dataset.mapState = state;
    progress.hidden = revealed || error || !config;
    if (state === 'loading') progress.removeAttribute('value');
    const activity = root.querySelector('.explorer-map-activity');
    activity.hidden = !revealed || state !== 'calculating';
    activity.textContent = `${t('calculating')} ${Math.round(progress.value * 100)}%`;
    root.querySelector('.explorer-detail').textContent = config ? `${t('detail')}: ${scale} ${t('blocks')} / px` : '';
    const scaleLength = 2 ** Math.floor(Math.log2(view.bpp * Math.min(100, width / 3)));
    const scaleBar = root.querySelector('.explorer-scale'); scaleBar.style.width = `${scaleLength / view.bpp}px`; scaleBar.textContent = `${scaleLength.toLocaleString(language)} ${t('blocks')}`;
    root.querySelector('.explorer-position').textContent = `X: ${Math.round(selected?.x ?? view.x)} · Z: ${Math.round(selected?.z ?? view.z)}`;
    if (revealed && spawn) {
      const pin = root.querySelector('.explorer-spawn');
      const x = width / 2 + (spawn.x - view.x) / view.bpp, y = height / 2 + (spawn.z - view.z) / view.bpp;
      pin.style.left = `${x}px`; pin.style.top = `${y}px`;
      pin.hidden = x < 0 || x > width || y < 0 || y > height;
      const label = `${t('spawn')} · X: ${spawn.x} · Z: ${spawn.z}`;
      pin.setAttribute('aria-label', label); pin.title = `${label}. ${t('spawnNote')}`;
    }

  }
  function resize() {
    const bounds = canvas.getBoundingClientRect(); width = Math.max(1, bounds.width); height = Math.max(1, bounds.height);
    const dpr = Math.min(2, window.devicePixelRatio || 1); canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    view = clampView(view, width, height); schedule();
  }
  function coordinates(event) { const rect = canvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; }
  function inspect(position) {
    if (!revealed || error) return;
    const point = worldAt(view, width, height, position.x, position.y); const x = Math.floor(point.x), z = Math.floor(point.z);
    if (x < -LIMIT || x > LIMIT || z < -LIMIT || z > LIMIT) { selected = null; pointId = -1; clearTimeout(pointTimer); updateBiom(); return; }
    selected = { x, z }; pointId = -1; updateBiom(); schedule(); clearTimeout(pointTimer);
    pointTimer = setTimeout(() => { if (pool && !error) pointId = pool.point(x, z); }, 70);
  }
  function changeView(next) { if (!revealed || error) return; view = clampView(next, width, height); selected = null; pointId = -1; clearTimeout(pointTimer); updateBiom(); schedule(); }
  listen(form, 'submit', generate);
  listen(root, 'click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'random') { form.elements.seed.value = randomSeed(); form.elements.seed.focus(); }
    if (action === 'retry') generate();
    if (action === 'download' && revealed && !error) exporter.open();
    if (action === 'in' || action === 'out') changeView(zoomAt(view, width, height, width / 2, height / 2, action === 'in' ? .5 : 2));
    if (action === 'reset') changeView({ ...view, x: 0, z: 0 });
  });
  listen(canvas, 'wheel', event => { if (!revealed || error) return; event.preventDefault(); const p = coordinates(event); changeView(zoomAt(view, width, height, p.x, p.y, Math.exp(Math.max(-300, Math.min(300, event.deltaY)) * .002))); }, { passive: false });
  listen(canvas, 'pointerdown', event => { if (!revealed || error) return; canvas.focus(); canvas.setPointerCapture(event.pointerId); pointers.set(event.pointerId, coordinates(event)); });
  listen(canvas, 'pointermove', event => {
    const next = coordinates(event); const previous = pointers.get(event.pointerId);
    if (!previous) { if (event.pointerType !== 'touch') inspect(next); return; }
    const before = [...pointers.values()]; pointers.set(event.pointerId, next); const after = [...pointers.values()];
    if (before.length >= 2) {
      const distance = points => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const mid = points => ({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 });
      const oldMid = mid(before), newMid = mid(after); const anchor = worldAt(view, width, height, oldMid.x, oldMid.y);
      const bpp = clampView({ ...view, bpp: view.bpp * distance(before) / Math.max(1, distance(after)) }, width, height).bpp;
      changeView({ bpp, x: anchor.x - (newMid.x - width / 2) * bpp, z: anchor.z - (newMid.y - height / 2) * bpp });
    } else changeView({ ...view, x: view.x - (next.x - previous.x) * view.bpp, z: view.z - (next.y - previous.y) * view.bpp });
  });
  listen(canvas, 'pointerup', event => { pointers.delete(event.pointerId); inspect(coordinates(event)); });
  listen(canvas, 'pointercancel', event => { pointers.delete(event.pointerId); });
  listen(canvas, 'lostpointercapture', event => { pointers.delete(event.pointerId); });
  listen(canvas, 'pointerleave', () => { if (!pointers.size) { selected = null; pointId = -1; clearTimeout(pointTimer); updateBiom(); schedule(); } });
  listen(window, 'blur', () => pointers.clear());
  listen(canvas, 'keydown', event => {
    if (!revealed || error) return;
    const steps = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (steps[event.key]) { event.preventDefault(); const [x, z] = steps[event.key]; changeView({ ...view, x: view.x + x * width * view.bpp / 5, z: view.z + z * height * view.bpp / 5 }); }
    if (['+', '=', '-', 'Home'].includes(event.key)) { event.preventDefault(); changeView(event.key === 'Home' ? { ...view, x: 0, z: 0 } : zoomAt(view, width, height, width / 2, height / 2, event.key === '-' ? 2 : .5)); }
  });
  const observer = new ResizeObserver(resize); observer.observe(canvas);
  const languageObserver = new MutationObserver(refreshLanguage); languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  refreshLanguage(); resize();
  return { dispose() { disposed = true; cleanup.abort(); observer.disconnect(); languageObserver.disconnect(); pool?.dispose(); exporter.dispose(); cache.clear(); overview.clear(); clearTimeout(pointTimer); cancelAnimationFrame(frame); container.replaceChildren(); } };
}
