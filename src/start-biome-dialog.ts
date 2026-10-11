import type { BiomeCard, SearchResult, SearchRequest, SearchResponse, WorkerPort } from './types.ts';
import { createWorker } from './wasm-adapter.ts';
import { query, canvasContext, closest, translated } from './dom.ts';
import './start-biome-dialog.css';
import { VERSIONS, requireVersion } from './explorer-core.ts';
import { colourize } from './biome-palette.ts';
import { requireBiomeSize, BIOME_SIZES, biomeSizeRadius, explorerLink } from './start-biome-core.ts';

const copy = {
  de: { empty: 'Wähle deine Welteinstellungen und klicke auf „Seed finden“.', heading: 'DEIN STARTBIOM', mapTitle: 'Spawn-Vorschau', seedLabel: 'Dein Minecraft-Seed', awaiting: 'Dein Seed erscheint hier', awaitingHint: 'Wähle deine Einstellungen und starte die Suche.', copySeed: 'Seed kopieren', copied: 'Kopiert', copyError: 'Fehlgeschlagen', copyErrorHint: 'Kopieren fehlgeschlagen. Bitte den Seed markieren und manuell kopieren.', size: 'Biomgröße', small: 'Klein', medium: 'Mittel', largeSize: 'Groß', version: 'Minecraft Java Version', world: 'Weltvariante', standard: 'Standard', large: 'Große Biome', find: 'Seed finden', again: 'Weiteren Seed finden', cancel: 'Abbrechen', close: 'Schließen', open: 'Im Seed Explorer öffnen', note: 'Spawn geschätzt; kann vom Minecraft-Weltspawn abweichen.', slice: 'Biomprüfung und Vorschau bei Y=64.', loading: 'Biomgenerator wird geladen …', searching: 'Suche läuft · Geprüfte Seeds:', found: 'Passender Seed gefunden', stopped: 'Suche abgebrochen.', error: 'Die Seed-Suche ist fehlgeschlagen. Bitte erneut versuchen.', preview: 'Kartenvorschau wird berechnet …', previewError: 'Die Kartenvorschau konnte nicht geladen werden.', retry: 'Vorschau erneut laden', map: 'Kartenvorschau mit geschätztem Weltspawn', spawn: 'Geschätzter Weltspawn' },
  en: { empty: 'Choose your world settings and click “Find seed”.', heading: 'YOUR STARTING BIOME', mapTitle: 'Spawn preview', seedLabel: 'Your Minecraft seed', awaiting: 'Your seed will appear here', awaitingHint: 'Choose your settings and start the search.', copySeed: 'Copy seed', copied: 'Copied', copyError: 'Copy failed', copyErrorHint: 'Copy failed. Please select the seed and copy it manually.', size: 'Biome size', small: 'Small', medium: 'Medium', largeSize: 'Large', version: 'Minecraft Java version', world: 'World type', standard: 'Default', large: 'Large Biomes', find: 'Find seed', again: 'Find another seed', cancel: 'Cancel', close: 'Close', open: 'Open in Seed Explorer', note: 'Estimated spawn; may differ from the Minecraft world spawn.', slice: 'Biome check and preview at Y=64.', loading: 'Loading biome generator …', searching: 'Searching · Seeds checked:', found: 'Matching seed found', stopped: 'Search cancelled.', error: 'The seed search failed. Please try again.', preview: 'Generating map preview …', previewError: 'The map preview could not be loaded.', retry: 'Reload preview', map: 'Map preview with estimated world spawn', spawn: 'Estimated world spawn' },
};

const fa = (name: string) => `<i class="fa-solid fa-${name}" aria-hidden="true"></i>`;
const pin = '<svg width="36" height="44" viewBox="0 0 36 44" aria-hidden="true"><path d="M18 44C15 36 3 27 3 17a15 15 0 0 1 30 0c0 10-12 19-15 27Z"/><circle cx="18" cy="17" r="5" fill="white" stroke="none"/></svg>';

export function createStartBiomeDialog(root: HTMLElement, biomes: BiomeCard[]) {
  const dialog = document.createElement('dialog');
  dialog.className = 'start-biome-dialog'; dialog.setAttribute('aria-labelledby', 'start-biome-title');
  dialog.innerHTML = `<header><div><p class="start-biome-eyebrow" data-copy="heading"></p><h2 id="start-biome-title"><i aria-hidden="true"></i><span></span></h2></div><button type="button" data-start="close">${fa('xmark')}</button></header>
    <form><div class="start-biome-fields"><label><span class="start-biome-field-label">${fa('cube')}<span data-copy="version"></span></span><span class="start-biome-select"><select name="version">${[...VERSIONS].reverse().map(v => `<option>${v}</option>`).join('')}</select>${fa('chevron-down')}</span></label><label><span class="start-biome-field-label">${fa('sliders')}<span data-copy="world"></span></span><span class="start-biome-select"><select name="world"><option value="standard" data-copy="standard"></option><option value="large" data-copy="large"></option></select>${fa('chevron-down')}</span></label><label><span class="start-biome-field-label">${fa('expand')}<span data-copy="size"></span></span><span class="start-biome-select"><select name="biomeSize">${Object.keys(BIOME_SIZES).map(size => `<option value="${size}" ${size === 'medium' ? 'selected' : ''} data-copy="${size === 'large' ? 'largeSize' : size}"></option>`).join('')}</select>${fa('chevron-down')}</span></label></div>
    <div class="start-biome-actions"><button type="submit" class="start-biome-primary" data-start="find">${fa('magnifying-glass')}<span></span></button><button type="button" data-start="cancel" hidden>${fa('stop')}<span data-copy="cancel"></span></button></div>
    </form>
    <div class="start-biome-map-area">
    <div class="start-biome-preview"><div class="start-biome-map-label">${fa('map')}<span data-copy="mapTitle"></span></div><canvas width="512" height="256" role="img" hidden></canvas><span class="start-biome-pin" role="img" hidden>${pin}</span><div class="start-biome-preview-status"><i class="fa-solid fa-compass" aria-hidden="true"></i><span></span><button type="button" data-start="preview" hidden>${fa('rotate-right')}<span data-copy="retry"></span></button></div></div>
    <div class="start-biome-status" role="status" aria-live="polite"><progress hidden></progress><span></span></div></div>
    <div class="start-biome-footer"><div class="start-biome-awaiting">${fa('key')}<div><strong data-copy="awaiting"></strong><p data-copy="awaitingHint"></p></div></div><section class="start-biome-result" hidden><div class="start-biome-seed-details"><p class="start-biome-seed-label">${fa('circle-check')}<span data-copy="seedLabel"></span></p><input type="text" class="start-biome-seed" data-start="copy" readonly autocomplete="off" spellcheck="false" /></div><a class="start-biome-primary" data-start="open">${fa('arrow-up-right-from-square')}<span data-copy="open"></span></a></section></div>
    <footer><p class="start-biome-note">${fa('circle-info')}<span><span data-copy="note"></span> <span data-copy="slice"></span></span></p>
    <p class="start-biome-attribution">${fa('code')} Generator: <a href="https://github.com/Cubitect/cubiomes" target="_blank" rel="noopener">Cubiomes</a> · <a href="https://github.com/fwsoapy/seedforge" target="_blank" rel="noopener">SeedForge</a> · <a href="/wasm/LICENSES.txt" target="_blank" rel="noopener">Lizenzen / Licences</a></p></footer>`;
  root.append(dialog);
  const q = (selector: string) => query(dialog, selector), form = query(dialog, 'form', 'form');
  const seed = query(dialog, '.start-biome-seed', 'input');
  const seedRow = document.createElement('div'); seedRow.className = 'start-biome-seed-row';
  seed.replaceWith(seedRow);
  seedRow.innerHTML = `<button type="button" class="start-biome-copy" data-start="copy">${fa('copy')}</button>`;
  seedRow.prepend(seed);
  const feedback = document.createElement('span'); feedback.className = 'start-biome-copy-feedback'; feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
  q('.start-biome-seed-label').append(feedback);
  let selected = 0, serial = 0, attempts = 0, disposed = false;
  let trigger: HTMLElement | undefined, worker: WorkerPort<SearchRequest, SearchResponse> | null = null, result: SearchResult | null = null;
  let state: 'idle' | 'loading' | 'searching' | 'found' | 'stopped' | 'error' = 'idle'; let previewState: 'loading' | 'ready' | 'error' = 'loading';
  let copyState: 'idle' | 'copying' | 'copied' | 'error' = 'idle', copySerial = 0; let copyTimer: ReturnType<typeof setTimeout> | 0 = 0;
  const excluded = new Set<string>();
  const language = () => document.documentElement.lang === 'de' ? 'de' : 'en';
  const t = (key: keyof typeof copy.en) => copy[language()][key];
  function refresh() {
    dialog.querySelectorAll<HTMLElement>('[data-copy]').forEach(el => { el.textContent = translated(copy[language()], el.dataset.copy); });
    const largeWorld = query(form, '[name="world"]', 'select').value === 'large';
    for (const option of query(form, '[name="biomeSize"]', 'select').options) {
      const radius = biomeSizeRadius(requireBiomeSize(option.value), largeWorld);
      option.textContent = `${t(option.value === 'large' ? 'largeSize' : requireBiomeSize(option.value))} (${radius})`;
      option.title = language() === 'de' ? `${radius} Blöcke Umkreis` : `${radius} block radius`;
    }
    const radius = biomeSizeRadius(requireBiomeSize(query(form, '[name="biomeSize"]', 'select').value), largeWorld);
    query(form, '[name="biomeSize"]', 'select').title = language() === 'de' ? `Mindestens 80 % der geprüften Positionen in ${radius} Blöcken Umkreis gehören zum Startbiom.` : `At least 80% of sampled positions within a ${radius} block radius match the starting biome.`;
    q('h2 span').textContent = biomes[selected]![language()][0];
    q('h2 i').className = `fa-solid ${biomes[selected]!.icon}`;
    q('h2 i').style.color = biomes[selected]!.color;
    q('[data-start="close"]').setAttribute('aria-label', t('close'));
    dialog.querySelectorAll<HTMLElement>('[data-start="copy"]').forEach(button => {
      const label = button === seed ? t('seedLabel') : t(copyState === 'copied' ? 'copied' : 'copySeed');
      button.setAttribute('aria-label', `${label}${result ? `: ${result.config.seed}` : ''}`);
      button.title = t(copyState === 'error' ? 'copyErrorHint' : copyState === 'copied' ? 'copied' : 'copySeed');
      if (button.localName === 'button') query(dialog, '.start-biome-copy', 'button').disabled = !result || copyState === 'copying';
    });
    seedRow.dataset.copyState = copyState;
    q('.start-biome-copy i').className = `fa-solid fa-${copyState === 'copied' ? 'check' : copyState === 'error' ? 'triangle-exclamation' : 'copy'}`;
    feedback.textContent = copyState === 'copied' ? t('copied') : copyState === 'error' ? t('copyError') : '';
    feedback.dataset.state = copyState;
    const busy = state === 'loading' || state === 'searching';
    form.querySelectorAll<HTMLSelectElement>('select').forEach(el => { el.disabled = busy; });
    query(dialog, '[data-start="find"]', 'button').disabled = busy;
    q('[data-start="find"] span').textContent = t(result ? 'again' : 'find');
    q('[data-start="find"] i').className = `fa-solid fa-${result ? 'rotate-right' : 'magnifying-glass'}`;
    q('[data-start="cancel"]').hidden = !busy;
    query(dialog, 'progress', 'progress').hidden = !busy;
    query(dialog, 'progress', 'progress').setAttribute('aria-label', t('find'));
    q('.start-biome-status span').textContent = state === 'searching' ? `${t('searching')} ${attempts.toLocaleString(language())}` : state === 'idle' ? '' : t(state);
    q('.start-biome-status').setAttribute('aria-busy', String(busy));
    q('.start-biome-result').hidden = !result;
    q('.start-biome-awaiting').hidden = Boolean(result);
    dialog.dataset.state = state;
    q('.start-biome-preview').toggleAttribute('data-empty', previewState !== 'ready' || !result);
    q('.start-biome-preview-status').hidden = previewState === 'ready';
    q('.start-biome-preview-status span').textContent = result ? t(previewState === 'error' ? 'previewError' : 'preview') : busy ? '' : state === 'error' || state === 'stopped' ? t(state) : t('empty');
    const previewBusy = busy || Boolean(result && previewState === 'loading');
    q('.start-biome-preview-status > i').className = `fa-solid fa-${previewBusy ? 'circle-notch fa-spin' : previewState === 'error' || state === 'error' ? 'triangle-exclamation' : state === 'stopped' ? 'pause' : 'compass'}`;
    q('[data-start="preview"]').hidden = previewState !== 'error';
    query(dialog, 'canvas', 'canvas').setAttribute('aria-label', t('map'));
    if (result) {
      seed.value = result.config.seed;
      const coordinates = `X: ${result.spawn.x} · Z: ${result.spawn.z}`;
      q('.start-biome-pin').setAttribute('aria-label', `${t('spawn')} · ${coordinates}`);
      query(dialog, '[data-start="open"]', 'a').href = explorerLink(result.config);
    }
  }
  function stop() { serial++; worker?.terminate(); worker = null; }
  function resetCopy() { clearTimeout(copyTimer); copyTimer = 0; copySerial++; copyState = 'idle'; }
  async function copySeed() {
    if (!result || copyState === 'copying') return;
    resetCopy(); const id = copySerial, saved = result;
    copyState = 'copying'; refresh();
    try {
      await navigator.clipboard.writeText(saved.config.seed);
      if (disposed || id !== copySerial || result !== saved || !dialog.open) return;
      copyState = 'copied';
    } catch {
      if (disposed || id !== copySerial || result !== saved || !dialog.open) return;
      copyState = 'error';
    }
    refresh();
    copyTimer = setTimeout(() => { copyState = 'idle'; copyTimer = 0; refresh(); }, 2500);
  }
  function clearResult() { resetCopy(); result = null; previewState = 'loading'; query(dialog, 'canvas', 'canvas').hidden = true; q('.start-biome-pin').hidden = true; }
  function close() { stop(); resetCopy(); if (dialog.open) dialog.close(); if (!disposed && trigger?.isConnected) trigger.focus(); }
  function start(event?: Event) {
    event?.preventDefault();
    if (state === 'loading' || state === 'searching') return;
    stop(); clearResult(); attempts = 0; state = 'loading'; refresh();
    const id = serial;
    try {
      worker = createWorker<SearchRequest, SearchResponse>(new Worker(new URL('./start-biome-worker.ts', import.meta.url), { type: 'module' }));
      const fail = (phase: 'preview' | 'search') => {
        if (id !== serial || disposed) return;
        stop();
        if (phase === 'preview' || result) previewState = 'error'; else state = 'error';
        refresh();
      };
      worker.onerror = () => fail(result ? 'preview' : 'search');
      worker.onmessage = ({ data }) => {
        if (disposed || data.id !== serial || !dialog.open) return;
        if (data.type === 'error') { fail(data.phase); return; }
        if (data.type === 'progress') { state = 'searching'; attempts = data.attempts; }
        if (data.type === 'found') {
          result = data.result; excluded.add(result.config.seed); state = 'found';
          worker?.postMessage({ type: 'preview', id });
        }
        if (data.type === 'preview') {
          try {
            const canvas = query(dialog, 'canvas', 'canvas'); canvas.width = data.width; canvas.height = data.height;
            canvasContext(canvas).putImageData(new ImageData(colourize(data.ids), data.width, data.height), 0, 0);
            canvas.hidden = false;
            const marker = q('.start-biome-pin'); marker.style.left = `${data.pin.x * 100}%`; marker.style.top = `${data.pin.z * 100}%`; marker.hidden = false;
            previewState = 'ready'; stop();
          } catch { fail('preview'); return; }
        }
        refresh();
      };
      worker.postMessage({ type: 'search', id, config: { version: requireVersion(query(form, '[name="version"]', 'select').value), large: query(form, '[name="world"]', 'select').value === 'large' }, biome: biomes[selected]!.id, size: requireBiomeSize(query(form, '[name="biomeSize"]', 'select').value), excluded: [...excluded] });
    } catch { stop(); state = 'error'; refresh(); }
  }
  function retryPreview() {
    if (!result) return;
    stop(); previewState = 'loading'; refresh();
    const id = serial;
    const fail = () => { if (id !== serial) return; stop(); previewState = 'error'; refresh(); };
    try {
      worker = createWorker<SearchRequest, SearchResponse>(new Worker(new URL('./start-biome-worker.ts', import.meta.url), { type: 'module' }));
      worker.onerror = fail;
      worker.onmessage = ({ data }) => {
        if (id !== serial || data.id !== id) return;
        if (data.type === 'error') { fail(); return; }
        if (data.type === 'preview') {
          try {
            canvasContext(query(dialog, 'canvas', 'canvas')).putImageData(new ImageData(colourize(data.ids), data.width, data.height), 0, 0);
            query(dialog, 'canvas', 'canvas').hidden = false;
            q('.start-biome-pin').style.left = `${data.pin.x * 100}%`;
            q('.start-biome-pin').style.top = `${data.pin.z * 100}%`;
            q('.start-biome-pin').hidden = false;
            stop(); previewState = 'ready'; refresh();
          } catch { fail(); }
        }
      };
      worker.postMessage({ type: 'preview', id, result });
    } catch { fail(); }
  }
  function onClick(event: MouseEvent) {
    const action = closest(event.target, '[data-start]')?.dataset.start;
    const bounds = dialog.getBoundingClientRect();
    const backdrop = event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
    if (backdrop || action === 'close' || action === 'open') close();
    if (action === 'cancel') { stop(); state = 'stopped'; refresh(); }
    if (action === 'preview') retryPreview();
    if (action === 'copy') void copySeed();
  }
  function onCopyKey(event: KeyboardEvent) { if (event.target === seed && ['Enter', ' '].includes(event.key)) { event.preventDefault(); void copySeed(); } }
  function onCancel(event: Event) { event.preventDefault(); close(); }
  function onChange() { stop(); clearResult(); state = 'idle'; refresh(); }
  form.addEventListener('submit', start); form.addEventListener('change', onChange);
  dialog.addEventListener('keydown', onCopyKey); dialog.addEventListener('click', onClick); dialog.addEventListener('cancel', onCancel);
  return {
    open(index: number, element: HTMLElement) { stop(); query(form, '[name="biomeSize"]', 'select').value = 'medium'; selected = index; trigger = element; clearResult(); state = 'idle'; refresh(); dialog.showModal(); query(form, '[name="version"]', 'select').focus(); },
    refresh,
    dispose() { disposed = true; close(); form.removeEventListener('submit', start); form.removeEventListener('change', onChange); dialog.removeEventListener('keydown', onCopyKey); dialog.removeEventListener('click', onClick); dialog.removeEventListener('cancel', onCancel); dialog.remove(); },
  };
}
