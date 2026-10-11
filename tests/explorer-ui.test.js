import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Worker as NodeWorker } from 'node:worker_threads';
import { JSDOM } from 'jsdom';
import { createCanvas, ImageData } from '@napi-rs/canvas';

test('technical DOM/canvas integration: workers, navigation, translation, reload, recovery and performance', { timeout: 60000 }, async () => {
  // No browser is launched and no screenshot/image file is created or viewed.
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/#/seed-explorer', pretendToBeVisual: true });
  const { window } = dom;
  const bodyHtml = window.document.body.innerHTML;
  const canvasStore = new WeakMap(), timings = [], transferTimings = [], coarseTimings = [];
  const liveWorkers = new Set(); let failWorkers = false, failExports = false;
  const received = []; let downloaded = '';
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  window.HTMLAnchorElement.prototype.click = function () { downloaded = this.download; };
  Object.defineProperty(window.navigator, 'hardwareConcurrency', { value: 4 });
  Object.defineProperty(window.navigator, 'languages', { value: ['de-DE'] });
  Object.defineProperty(window.document, 'fonts', { value: Object.assign(new window.EventTarget(), { ready: Promise.resolve() }) });
  window.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({ width: 1200, height: 600, left: 0, top: 0 });
  window.HTMLCanvasElement.prototype.setPointerCapture = () => {};
  window.HTMLCanvasElement.prototype.getContext = function () {
    const thisCanvas = this;
    if (!canvasStore.has(this)) canvasStore.set(this, createCanvas(this.width, this.height));
    const native = canvasStore.get(this);
    if (native.width !== this.width) native.width = this.width;
    if (native.height !== this.height) native.height = this.height;
    const context = native.getContext('2d');
    return new Proxy(context, {
      get(target, property) {
        if (native.width !== thisCanvas.width) native.width = thisCanvas.width;
        if (native.height !== thisCanvas.height) native.height = thisCanvas.height;
        if (property === 'drawImage') return (source, ...args) => target.drawImage(canvasStore.get(source) ?? source, ...args);
        const value = target[property]; return typeof value === 'function' ? value.bind(target) : value;
      },
      set(target, property, value) { target[property] = value; return true; },
    });
  };
  class TechnicalWorker {
    constructor(url) {
      this.isExport = url.pathname.endsWith('/export-worker.js');
      this.native = new NodeWorker(new URL(url.pathname.endsWith('/export-worker.js') ? './node-export-worker.js' : './node-biome-worker.js', import.meta.url)); liveWorkers.add(this);
      this.native.on('message', data => {
        const start = performance.now();
        if (data.type === 'ready') this.readyAt = start;
        if (data.type === 'tile' && data.scale === 64) coarseTimings.push(start - this.readyAt);
        received.push(data);
        this.onmessage?.({ data }); transferTimings.push(performance.now() - start);
      });
      this.native.on('error', error => this.onerror?.({ message: error.message }));
    }
    postMessage(data) {
      this.lastJob = data;
      if (failWorkers || (this.isExport && failExports)) { queueMicrotask(() => this.onmessage?.({ data: { type: 'error', generation: data.generation, id: data.id, message: 'Simulated WASM loading failure' } })); return; }
      this.native.postMessage(data);
    }
    terminate() { liveWorkers.delete(this); this.native.terminate(); }
  }
  const rafHandles = new Map(); let rafId = 0;
  const globals = {
    window, document: window.document, navigator: window.navigator, location: window.location, localStorage: window.localStorage,
    getComputedStyle: window.getComputedStyle.bind(window), matchMedia: () => ({ matches: true }),
    ResizeObserver: class { observe() {} disconnect() {} }, MutationObserver: window.MutationObserver,
    AbortController: window.AbortController, ImageData, Worker: TechnicalWorker,
    requestAnimationFrame(callback) { const id = ++rafId; rafHandles.set(id, setTimeout(() => { rafHandles.delete(id); const start = performance.now(); callback(start); if (callback.name === 'draw') timings.push(performance.now() - start); }, 0)); return id; },
    cancelAnimationFrame(id) { clearTimeout(rafHandles.get(id)); rafHandles.delete(id); },
  };
  const previous = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  const wait = async predicate => {
    const start = Date.now(); while (!predicate()) { if (Date.now() - start > 15000) throw new Error('DOM condition timed out'); await new Promise(resolve => setTimeout(resolve, 10)); }
  };
  const q = selector => window.document.querySelector(selector);
  const submit = selector => q(selector).dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  const event = (type, values) => Object.assign(new window.Event(type, { bubbles: true, cancelable: true }), values);
  try {
    await import('../src/main.js');
    assert(q('.explorer')); assert.equal(window.document.documentElement.lang, 'de');
    assert.equal(q('.explorer-placeholder').textContent.trim(), 'Erneut versuchen');
    assert.equal(q('.explorer-map-wrap').contains(q('.explorer-status')), true);
    assert.equal(q('.explorer-map-wrap').nextElementSibling.className, 'explorer-attribution');
    assert.equal(q('#map-help'), null); assert.equal(q('.explorer-local'), null);
    submit('.explorer-form'); assert(!q('#seed-error').hidden); assert.equal(liveWorkers.size, 0);
    q('[data-action="random"]').click(); assert.match(q('[name="seed"]').value, /^-?\d+$/);
    q('[name="seed"]').value = '-9223372036854775808'; const generationStart = performance.now(); submit('.explorer-form');
    assert(!q('.explorer-placeholder').hidden); assert(q('[data-action="download"]').disabled);
    assert(q('.explorer-map-wrap').hasAttribute('data-empty'));
    await wait(() => q('.explorer-status').textContent.includes('Karte bereit'));
    const fullStartMs = performance.now() - generationStart;
    assert(q('.explorer-placeholder').hidden); assert(!q('[data-action="download"]').disabled);
    assert.equal(new Set(received.filter(d => d.type === 'tile' && d.scale === 64).map(d => `${d.tx}:${d.tz}`)).size, 16);
    const spawn = received.find(d => d.type === 'spawn'); assert(spawn);
    assert.match(q('.explorer-spawn').getAttribute('aria-label'), new RegExp(`X: ${spawn.x} · Z: ${spawn.z}`));
    assert(q('.explorer-spawn').classList.contains('is-dropping'));
    q('[data-action="download"]').click(); assert(q('dialog').open);
    assert.match(q('.explorer-export-size').textContent, /4 Blöcke/);
    q('[data-export="start"]').click();
    const exportingWorker = [...liveWorkers].find(worker => worker.isExport);
    exportingWorker.onmessage({ data: { ...exportingWorker.lastJob, type: 'done', generation: -1 } });
    assert(q('dialog').open);
    await wait(() => !q('dialog').open);
    assert.match(downloaded, /^seed--9223372036854775808_26\.3_standard_x.*_4bpp\.(webp|jpg)$/);
    assert.equal(liveWorkers.size, 2);
    q('[data-action="download"]').click(); assert.equal(q('[name="export-area"]'), null);
    q('[data-export="start"]').click(); const cancelledWorker = [...liveWorkers].find(worker => worker.isExport);
    q('[data-export="cancel"]').click();
    const previousDownload = downloaded;
    cancelledWorker.onmessage({ data: { ...cancelledWorker.lastJob, type: 'done' } });
    assert.equal(downloaded, previousDownload);
    assert.equal(liveWorkers.size, 2); assert(!q('dialog').open);
    failExports = true; q('[data-action="download"]').click(); q('[data-export="start"]').click();
    await wait(() => q('.explorer-export-progress').textContent.includes('fehlgeschlagen'));
    assert(q('dialog').open); assert.equal(liveWorkers.size, 2); assert(!q('[data-export="start"]').disabled);
    failExports = false; q('[data-export="start"]').click(); await wait(() => !q('dialog').open);
    assert.equal(liveWorkers.size, 2); assert(q('#seed-error').hidden);
    const firstReady = Math.max(...coarseTimings); assert(firstReady < 2000, `Coarse tiles ${firstReady}ms`);
    const canvas = q('canvas');
    canvas.dispatchEvent(event('pointermove', { clientX: 600, clientY: 300, pointerId: 1, pointerType: 'mouse' }));
    await wait(() => q('.explorer-biome').textContent.length > 0);
    canvas.dispatchEvent(new window.KeyboardEvent('keydown', { key: '+', bubbles: true, cancelable: true }));
    await wait(() => q('.explorer-detail').textContent.includes('1 Blöcke'));
    canvas.dispatchEvent(event('wheel', { clientX: 700, clientY: 300, deltaY: -200 }));
    canvas.dispatchEvent(event('pointerdown', { clientX: 300, clientY: 200, pointerId: 1, pointerType: 'touch' }));
    canvas.dispatchEvent(event('pointerdown', { clientX: 600, clientY: 200, pointerId: 2, pointerType: 'touch' }));
    canvas.dispatchEvent(event('pointermove', { clientX: 900, clientY: 200, pointerId: 2, pointerType: 'touch' }));
    canvas.dispatchEvent(event('pointerup', { clientX: 300, clientY: 200, pointerId: 1, pointerType: 'touch' }));
    canvas.dispatchEvent(event('pointerup', { clientX: 900, clientY: 200, pointerId: 2, pointerType: 'touch' }));
    assert.equal(q('.explorer-jump'), null);
    assert.equal(q('.explorer-coordinate-row'), null);
    assert.equal(q('[data-action="download"]').parentElement.className, 'explorer-map-footer');
    canvas.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    q('input[name="language"][value="en"]').checked = true;
    q('input[name="language"][value="en"]').dispatchEvent(new window.Event('change', { bubbles: true }));
    await wait(() => q('[data-explorer-text="generate"]').textContent === 'Generate map');
    assert.equal(q('canvas').getAttribute('aria-label'), 'Interactive biome map');
    assert.equal(q('[name="seed"]').value, '-9223372036854775808');
    q('[data-action="download"]').click(); assert.match(q('.explorer-export-format').textContent, /WebP \/ JPEG/);
    q('[data-export="start"]').click();
    // Rapid changes must terminate old workers and not mix version/seed results.
    for (const version of ['26.1', '26.2', '26.3']) { q('[name="version"]').value = version; q('[name="settings"]').value = 'large'; submit('.explorer-form'); }
    assert(!q('dialog').open); assert(!q('.explorer-placeholder').hidden);
    await wait(() => q('.explorer-status').textContent.includes('Map ready'));
    assert.equal(liveWorkers.size, 2);
    // Simulate the existing HTML HMR event, including replacement of old nodes.
    window.document.body.innerHTML = bodyHtml;
    window.dispatchEvent(new window.CustomEvent('app:html-updated'));
    assert.equal(liveWorkers.size, 0); assert(q('.explorer-placeholder')); assert.equal(q('[name="seed"]').value, '');
    failWorkers = true; q('[name="seed"]').value = '123'; submit('.explorer-form');
    await wait(() => !q('[data-action="retry"]').hidden);
    assert.match(q('.explorer-status').textContent, /could not be loaded/); assert.equal(liveWorkers.size, 0);
    failWorkers = false; q('[data-action="retry"]').click(); await wait(() => q('.explorer-status').textContent.includes('Map ready'));
    window.location.hash = '';
    await wait(() => !q('.explorer')); assert.equal(liveWorkers.size, 0);
    mkdirSync('.cache', { recursive: true });
    const percentile = list => [...list].sort((a,b) => a-b)[Math.floor((list.length - 1) * .95)];
    const report = { environment: 'Node.js + jsdom DOM + native in-memory Canvas2D + real WASM worker threads; no browser or images', viewport: '1200x600, DPR=1', firstCoarseTilesMs: firstReady, frameCount: timings.length, frameMaxMs: Math.max(...timings), frameP95Ms: percentile(timings), tileMessageMaxMs: Math.max(...transferTimings), tileMessageP95Ms: percentile(transferTimings) };
    report.fullStartMs = fullStartMs;
    writeFileSync('.cache/ui-performance.json', JSON.stringify(report, null, 2)); console.log(report);
    assert(report.frameP95Ms < 16); assert(report.tileMessageP95Ms < 16);
  } finally {
    for (const worker of liveWorkers) worker.terminate();
    for (const handle of rafHandles.values()) clearTimeout(handle);
    dom.window.close();
    for (const [key, descriptor] of previous) if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
});
