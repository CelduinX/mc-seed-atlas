import { errorMessage } from '../src/wasm-adapter.ts';
import type { MapRequest, MapResponse, ExportRequest, ExportResponse, SearchRequest, SearchResponse } from '../src/types.ts';
import type { Canvas } from '@napi-rs/canvas';
type Request = MapRequest | ExportRequest | SearchRequest;
type Response = MapResponse | ExportResponse | SearchResponse;
import { createQuery } from './helpers.ts';
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
  const canvasStore = new WeakMap<HTMLCanvasElement, Canvas>(), timings: number[] = [], transferTimings: number[] = [], coarseTimings: number[] = [];
  const liveWorkers = new Set<TechnicalWorker>(); let failWorkers = false, failExports = false;
  const received: Response[] = []; let downloaded = '';
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  window.HTMLAnchorElement.prototype.click = function () { downloaded = this.download; };
  Object.defineProperty(window.navigator, 'hardwareConcurrency', { value: 4 });
  Object.defineProperty(window.navigator, 'languages', { value: ['de-DE'] });
  Object.defineProperty(window.document, 'fonts', { value: Object.assign(new window.EventTarget(), { ready: Promise.resolve() }) });
  window.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({ width: 1200, height: 600, left: 0, top: 0, right: 1200, bottom: 600, x: 0, y: 0, toJSON() { return {}; } });
  window.HTMLCanvasElement.prototype.setPointerCapture = () => {};
  window.HTMLCanvasElement.prototype.getContext = (function (this: HTMLCanvasElement) {
    const thisCanvas = this;
    if (!canvasStore.has(this)) canvasStore.set(this, createCanvas(this.width, this.height));
    const native = canvasStore.get(this)!;
    if (native.width !== this.width) native.width = this.width;
    if (native.height !== this.height) native.height = this.height;
    const context = native.getContext('2d');
    return new Proxy(context, {
      get(target, property) {
        if (native.width !== thisCanvas.width) native.width = thisCanvas.width;
        if (native.height !== thisCanvas.height) native.height = thisCanvas.height;
        if (property === 'drawImage') return (source: HTMLCanvasElement, ...args: number[]) => Reflect.apply(target.drawImage, target, [canvasStore.get(source) ?? source, ...args]);
        const value: unknown = Reflect.get(target, property); return typeof value === 'function' ? value.bind(target) : value;
      },
      set(target, property, value) { Reflect.set(target, property, value); return true; },
    });
  }) as unknown as HTMLCanvasElement['getContext'];
  class TechnicalWorker {
    isExport: boolean; native: NodeWorker; readyAt = 0; lastJob: Request | undefined;
    onmessage: ((event: { data: Response }) => void) | null = null;
    onerror: ((event: { message: string }) => void) | null = null;
    constructor(url: URL) {
      this.isExport = url.pathname.endsWith('/export-worker.ts');
      this.native = new NodeWorker(new URL(url.pathname.endsWith('/export-worker.ts') ? './node-export-worker.ts' : url.pathname.endsWith('/start-biome-worker.ts') ? './node-start-biome-worker.ts' : './node-biome-worker.ts', import.meta.url)); liveWorkers.add(this);
      this.native.on('message', (data: Response) => {
        const start = performance.now();
        if (data.type === 'ready') this.readyAt = start;
        if (data.type === 'tile' && data.scale === 64) coarseTimings.push(start - this.readyAt);
        received.push(data);
        this.onmessage?.({ data }); transferTimings.push(performance.now() - start);
      });
      this.native.on('error', error => this.onerror?.({ message: errorMessage(error) }));
    }
    postMessage(data: Request) {
      this.lastJob = data;
      if (failWorkers || (this.isExport && failExports)) { queueMicrotask(() => this.onmessage?.({ data: { type: 'error', generation: 'generation' in data ? data.generation : 0, id: data.id, message: 'Simulated WASM loading failure' } })); return; }
      this.native.postMessage(data);
    }
    terminate() { liveWorkers.delete(this); this.native.terminate(); }
  }
  const rafHandles = new Map<number, ReturnType<typeof setTimeout>>(); let rafId = 0;
  const globals = {
    window, document: window.document, navigator: window.navigator, location: window.location, localStorage: window.localStorage,
    getComputedStyle: window.getComputedStyle.bind(window), matchMedia: () => ({ matches: true }),
    ResizeObserver: class { observe() {} disconnect() {} }, MutationObserver: window.MutationObserver,
    AbortController: window.AbortController, ImageData, Worker: TechnicalWorker,
    requestAnimationFrame(callback: FrameRequestCallback) { const id = ++rafId; rafHandles.set(id, setTimeout(() => { rafHandles.delete(id); const start = performance.now(); callback(start); if (callback.name === 'draw') timings.push(performance.now() - start); }, 0)); return id; },
    cancelAnimationFrame(id: number) { clearTimeout(rafHandles.get(id)); rafHandles.delete(id); },
  };
  const previous = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  const wait = async (predicate: () => unknown) => {
    const start = Date.now(); while (!predicate()) { if (Date.now() - start > 15000) throw new Error('DOM condition timed out'); await new Promise<void>(resolve => setTimeout(resolve, 10)); }
  };
  const q = createQuery(window.document);
  const submit = (selector: string) => q(selector)!.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  const event = (type: string, values: Record<string, number | string>) => Object.assign(new window.Event(type, { bubbles: true, cancelable: true }), values);
  try {
    await import('../src/main.ts');
    assert(q('.explorer')!); assert.equal(window.document.documentElement.lang, 'de');
    assert.equal(q('.explorer-placeholder')!.textContent!.trim(), 'Erneut versuchen');
    assert.equal(q('.explorer-map-wrap')!.contains(q('.explorer-status')!), true);
    assert.equal(q('.explorer-map-wrap')!.nextElementSibling!.className, 'explorer-attribution');
    assert.equal(q('#map-help')!, null); assert.equal(q('.explorer-local')!, null);
    submit('.explorer-form'); assert(!q('#seed-error')!.hidden); assert.equal(liveWorkers.size, 0);
    q('[data-action="random"]')!.click(); assert.match(q('[name="seed"]', 'input')!.value, /^-?\d+$/);
    q('[name="seed"]', 'input')!.value = '-9223372036854775808'; const generationStart = performance.now(); submit('.explorer-form');
    assert(!q('.explorer-placeholder')!.hidden); assert(q('[data-action="download"]', 'button')!.disabled);
    assert(q('.explorer-map-wrap')!.hasAttribute('data-empty'));
    await wait(() => q('.explorer-status')!.textContent!.includes('Karte bereit'));
    const fullStartMs = performance.now() - generationStart;
    assert(q('.explorer-placeholder')!.hidden); assert(!q('[data-action="download"]', 'button')!.disabled);
    assert.equal(new Set(received.filter(d => d.type === 'tile').filter(d => d.scale === 64).map(d => `${d.tx}:${d.tz}`)).size, 16);
    const spawn = received.find(d => d.type === 'spawn'); assert(spawn);
    assert.match(q('.explorer-spawn')!.getAttribute('aria-label')!, new RegExp(`X: ${spawn.x} · Z: ${spawn.z}`));
    assert(q('.explorer-spawn')!.classList.contains('is-dropping'));
    q('[data-action="download"]', 'button')!.click(); assert(q('dialog', 'dialog')!.open);
    assert.match(q('.explorer-export-size')!.textContent!, /4 Blöcke/);
    q('[data-export="start"]', 'button')!.click();
    const exportingWorker = [...liveWorkers].find(worker => worker.isExport)!;
    exportingWorker.onmessage?.({ data: { ...exportingWorker.lastJob, type: 'done', generation: -1 } as ExportResponse });
    assert(q('dialog', 'dialog')!.open);
    await wait(() => !q('dialog', 'dialog')!.open);
    assert.match(downloaded, /^seed--9223372036854775808_26\.3_standard_x.*_4bpp\.(webp|jpg)$/);
    assert.equal(liveWorkers.size, 2);
    q('[data-action="download"]', 'button')!.click(); assert.equal(q('[name="export-area"]')!, null);
    q('[data-export="start"]', 'button')!.click(); const cancelledWorker = [...liveWorkers].find(worker => worker.isExport)!;
    q('[data-export="cancel"]')!.click();
    const previousDownload = downloaded;
    cancelledWorker.onmessage?.({ data: { ...cancelledWorker.lastJob, type: 'done' } as ExportResponse });
    assert.equal(downloaded, previousDownload);
    assert.equal(liveWorkers.size, 2); assert(!q('dialog', 'dialog')!.open);
    failExports = true; q('[data-action="download"]', 'button')!.click(); q('[data-export="start"]', 'button')!.click();
    await wait(() => q('.explorer-export-progress')!.textContent!.includes('fehlgeschlagen'));
    assert(q('dialog', 'dialog')!.open); assert.equal(liveWorkers.size, 2); assert(!q('[data-export="start"]', 'button')!.disabled);
    failExports = false; q('[data-export="start"]', 'button')!.click(); await wait(() => !q('dialog', 'dialog')!.open);
    assert.equal(liveWorkers.size, 2); assert(q('#seed-error')!.hidden);
    const firstReady = Math.max(...coarseTimings); assert(firstReady < 2000, `Coarse tiles ${firstReady}ms`);
    const canvas = q('canvas', 'canvas')!;
    canvas.dispatchEvent(event('pointermove', { clientX: 600, clientY: 300, pointerId: 1, pointerType: 'mouse' }));
    await wait(() => q('.explorer-biome')!.textContent!.length > 0);
    canvas.dispatchEvent(new window.KeyboardEvent('keydown', { key: '+', bubbles: true, cancelable: true }));
    await wait(() => q('.explorer-detail')!.textContent!.includes('1 Blöcke'));
    canvas.dispatchEvent(event('wheel', { clientX: 700, clientY: 300, deltaY: -200 }));
    canvas.dispatchEvent(event('pointerdown', { clientX: 300, clientY: 200, pointerId: 1, pointerType: 'touch' }));
    canvas.dispatchEvent(event('pointerdown', { clientX: 600, clientY: 200, pointerId: 2, pointerType: 'touch' }));
    canvas.dispatchEvent(event('pointermove', { clientX: 900, clientY: 200, pointerId: 2, pointerType: 'touch' }));
    canvas.dispatchEvent(event('pointerup', { clientX: 300, clientY: 200, pointerId: 1, pointerType: 'touch' }));
    canvas.dispatchEvent(event('pointerup', { clientX: 900, clientY: 200, pointerId: 2, pointerType: 'touch' }));
    assert.equal(q('.explorer-jump')!, null);
    assert.equal(q('.explorer-coordinate-row')!, null);
    assert.equal(q('[data-action="download"]', 'button')!.parentElement!.className, 'explorer-map-footer');
    canvas.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    q('input[name="language"][value="en"]', 'input')!.checked = true;
    q('input[name="language"][value="en"]', 'input')!.dispatchEvent(new window.Event('change', { bubbles: true }));
    await wait(() => q('[data-explorer-text="generate"]')!.textContent === 'Generate map');
    assert.equal(q('canvas', 'canvas')!.getAttribute('aria-label')!, 'Interactive biome map');
    assert.equal(q('[name="seed"]', 'input')!.value, '-9223372036854775808');
    q('[data-action="download"]', 'button')!.click(); assert.match(q('.explorer-export-format')!.textContent!, /WebP \/ JPEG/);
    q('[data-export="start"]', 'button')!.click();
    // Rapid changes must terminate old workers and not mix version/seed results.
    for (const version of ['26.1', '26.2', '26.3']) { q('[name="version"]', 'select')!.value = version; q('[name="settings"]', 'select')!.value = 'large'; submit('.explorer-form'); }
    assert(!q('dialog', 'dialog')!.open); assert(!q('.explorer-placeholder')!.hidden);
    await wait(() => q('.explorer-status')!.textContent!.includes('Map ready'));
    assert.equal(liveWorkers.size, 2);
    // Simulate the existing HTML HMR event, including replacement of old nodes.
    window.document.body.innerHTML = bodyHtml;
    window.dispatchEvent(new window.CustomEvent('app:html-updated'));
    assert.equal(liveWorkers.size, 0); assert(q('.explorer-placeholder')!); assert.equal(q('[name="seed"]', 'input')!.value, '');
    failWorkers = true; q('[name="seed"]', 'input')!.value = '123'; submit('.explorer-form');
    await wait(() => !q('[data-action="retry"]')!.hidden);
    assert.match(q('.explorer-status')!.textContent!, /could not be loaded/); assert.equal(liveWorkers.size, 0);
    failWorkers = false; q('[data-action="retry"]')!.click(); await wait(() => q('.explorer-status')!.textContent!.includes('Map ready'));
    window.location.hash = '';
    await wait(() => !q('.explorer')!); assert.equal(liveWorkers.size, 0);
    window.location.hash = '#/biome-finder';
    await wait(() => q('[data-biome="1"]')!);
    q('[data-biome="1"]')!.click(); assert(q('dialog', 'dialog')!.open);
    q('dialog [name="world"]', 'select')!.value = 'large';
    submit('dialog form');
    await wait(() => !q('dialog canvas', 'canvas')!.hidden);
    assert.equal(liveWorkers.size, 0);
    assert(!q('.start-biome-pin')!.hidden);
    const foundSeed = q('.start-biome-seed', 'input')!.value;
    const foundLink = q('[data-start="open"]', 'a')!.getAttribute('href');
    q('[data-start="open"]', 'a')!.addEventListener('click', event => event.preventDefault(), { once: true });
    q('[data-start="open"]', 'a')!.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); assert(!q('dialog', 'dialog')!.open);
    // Anchor navigation is stubbed for downloads in this test; apply its destination explicitly.
    assert(foundLink); window.location.hash = foundLink;
    await wait(() => q('.explorer-status')!?.textContent!.includes('Map ready'));
    assert.equal(q('[name="seed"]', 'input')!.value, foundSeed);
    assert.equal(q('[name="version"]', 'select')!.value, '26.3');
    assert.equal(q('[name="settings"]', 'select')!.value, 'large');
    assert.equal(q('a[href="#/seed-explorer"]', 'a')!.getAttribute('aria-current'), 'page');
    const estimatedSpawn = received.filter(data => data.type === 'spawn').at(-1)!;
    assert.equal(q('.explorer-position')!.textContent!, `X: ${estimatedSpawn.x} · Z: ${estimatedSpawn.z}`);
    window.location.hash = '#/seed-explorer?seed=bad&version=26.3&world=standard';
    await wait(() => q('#seed-error')! && !q('#seed-error')!.hidden);
    assert.match(q('#seed-error')!.textContent!, /world settings are invalid/);
    assert.equal(liveWorkers.size, 0);
    window.location.hash = '';
    await wait(() => !q('.explorer')!);
    assert(q('[data-page="home"]')!);
    assert(q('[data-page="home"]')!.querySelector('.wip-notice'));
    assert.equal(q('a[href="#/home"]', 'a')!.getAttribute('aria-current'), 'page');
    window.location.hash = '#/seed-crafter';
    await wait(() => q('[data-page="seed-crafter"]')!);
    assert(q('[data-page="seed-crafter"]')!.querySelector('.wip-notice'));
    assert.equal(q('a[href="#/seed-crafter"]', 'a')!.getAttribute('aria-current'), 'page');
    assert.equal(liveWorkers.size, 0);
    mkdirSync('.cache', { recursive: true });
    const percentile = (list: number[]) => [...list].sort((a,b) => a-b)[Math.floor((list.length - 1) * .95)]!;
    const report = { fullStartMs, environment: 'Node.js + jsdom DOM + native in-memory Canvas2D + real WASM worker threads; no browser or images', viewport: '1200x600, DPR=1', firstCoarseTilesMs: firstReady, frameCount: timings.length, frameMaxMs: Math.max(...timings), frameP95Ms: percentile(timings), tileMessageMaxMs: Math.max(...transferTimings), tileMessageP95Ms: percentile(transferTimings) };
    writeFileSync('.cache/ui-performance.json', JSON.stringify(report, null, 2)); console.log(report);
    assert(report.frameP95Ms < 16); assert(report.tileMessageP95Ms < 16);
  } finally {
    for (const worker of liveWorkers) worker.terminate();
    for (const handle of rafHandles.values()) clearTimeout(handle);
    dom.window.close();
    for (const [key, descriptor] of previous) if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key);
  }
});
