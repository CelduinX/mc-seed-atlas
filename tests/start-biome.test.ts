import type { Position, SearchRequest, SearchResponse, SearchResult, WorkerPort, WorldConfig } from '../src/types.ts';
import { ImageData } from '@napi-rs/canvas';
import { createQuery } from './helpers.ts';
import { query } from '../src/dom.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { loadEngine } from '../src/wasm-adapter.ts';
import { findSeed, previewIds, biomeSizeMatches } from '../src/start-biome-worker.ts';
import { explorerLink, explorerRoute, START_BIOME_IDS, BIOME_SIZES, biomeSizeRadius, requireBiomeSize } from '../src/start-biome-core.ts';
import { seedWords, VERSIONS } from '../src/explorer-core.ts';
import { createBiomeFinder } from '../src/biome-finder.ts';

test('Explorer links round-trip exact seeds and reject invalid world configurations', () => {
  for (const seed of ['-9223372036854775808', '9223372036854775807']) for (const large of [true, false]) {
    const config = { seed, version: VERSIONS.at(-1)!, large };
    assert.deepEqual(explorerRoute(explorerLink(config)), { path: '#/seed-explorer', config });
  }
  assert.deepEqual(explorerRoute('#/seed-explorer'), { path: '#/seed-explorer' });
  for (const query of ['seed=oops&version=26.3&world=standard', 'seed=1&version=unsupported&world=standard', 'seed=1&version=26.3&world=oops', 'seed=9223372036854775808&version=26.3&world=large']) assert.equal(explorerRoute(`#/seed-explorer?${query}`).error, true);
});

test('size filter checks a circular area and enforces the 80 percent threshold', () => {
  const spawn = { x: -300, z: 120 };
  const positions: Position[] = [];
  const engine = { _atlas_point(x: number, z: number) { positions.push({ x, z }); return 1; } };
  for (const large of [false, true]) for (const size of Object.keys(BIOME_SIZES).map(requireBiomeSize)) {
    const radius = biomeSizeRadius(size, large);
    assert.equal(radius, BIOME_SIZES[size] * (large ? 4 : 1));
    positions.length = 0;
    assert(biomeSizeMatches(engine, spawn, 1, size, large));
    assert(positions.every(p => Math.hypot(p.x - spawn.x, p.z - spawn.z) <= radius));
    assert(positions.some(p => p.x === spawn.x - radius && p.z === spawn.z));
    assert(positions.some(p => p.x === spawn.x + radius && p.z === spawn.z));
  }
  let count = 0;
  assert(!biomeSizeMatches({ _atlas_point: () => ++count <= 39 ? 1 : 4 }, spawn, 1, 'small'));
  count = 0;
  assert(biomeSizeMatches({ _atlas_point: () => ++count <= 40 ? 1 : 4 }, spawn, 1, 'small'));
  assert.throws(() => biomeSizeMatches({ _atlas_point: () => -1 }, spawn, 1, 'small'));
  // @ts-expect-error Deliberately invalid size exercises runtime validation.
  assert.throws(() => biomeSizeMatches(engine, spawn, 1, 'invalid'));
});

test('real WASM search applies each biome size for standard and large-biome worlds', { timeout: 60000 }, async () => {
  const engine = await loadEngine('biomes');
  for (const large of [false, true]) for (const size of Object.keys(BIOME_SIZES).map(requireBiomeSize)) {
    const result = await findSeed(engine, { version: VERSIONS.at(-1)!, large }, 4, { start: '0', size });
    assert.equal(result.size, size);
    assert.equal(engine._atlas_point(result.spawn.x, result.spawn.z), 4);
    assert(biomeSizeMatches(engine, result.spawn, 4, size, large));
  }
});

test('real WASM search finds exact selected biomes in both world types and renders aligned preview samples', { timeout: 120000 }, async () => {
  const engine = await loadEngine('biomes');
  for (const excluded of [0, 7, 14, 16, 23, 25, 26, 174, 175, 180, 183, 187]) {
    await assert.rejects(findSeed(engine, { version: VERSIONS.at(-1)!, large: false }, excluded, { start: '0' }), /Unsupported configuration/);
  }
  for (const large of [false, true]) for (const biome of START_BIOME_IDS) {
    const result = await findSeed(engine, { version: VERSIONS.at(-1)!, large }, biome, { start: '0' });
    assert(result.attempts > 0);
    engine._atlas_init(VERSIONS.length - 1, Number(large), ...seedWords(result.config.seed));
    const pointer = engine._atlas_spawn();
    assert.deepEqual(result.spawn, { x: engine.HEAP32[pointer / 4], z: engine.HEAP32[pointer / 4 + 1] });
    assert.equal(engine._atlas_point(result.spawn.x, result.spawn.z), biome);
    const preview = previewIds(engine, result);
    assert.equal(preview.ids.length, 512 * 256);
    assert(preview.pin.x >= .5 && preview.pin.x < .502);
    assert(preview.pin.z >= .5 && preview.pin.z < .504);
    const x = Math.floor(result.spawn.x / 4) - 256, z = Math.floor(result.spawn.z / 4) - 128;
    for (const [col, row] of [[0, 0], [127, 127], [256, 128], [511, 255]] as const) {
      const sample = engine._atlas_tile(4, x + col, z + row, 1, 1);
      assert.equal(preview.ids[row * 512 + col], engine.HEAP32[sample / 4]);
    }
    const next = await findSeed(engine, result.config, biome, { start: result.config.seed, excluded: [result.config.seed] });
    assert.notEqual(next.config.seed, result.config.seed);
  }
});

test('popup manages search, cancellation, stale replies, preview recovery, settings, language and disposal', async () => {
  const dom = new JSDOM('<html lang="de"><body><main></main></body></html>', { url: 'http://localhost/#/biome-finder' });
  const { window } = dom, workers: FakeWorker[] = [];
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  // Canvas test boundary: this popup only writes pixels.
  window.HTMLCanvasElement.prototype.getContext = (() => ({ putImageData() {} })) as unknown as HTMLCanvasElement['getContext'];
  class FakeWorker implements WorkerPort<SearchRequest, SearchResponse> {
    jobs: SearchRequest[] = []; terminated = false;
    onmessage: WorkerPort<SearchRequest, SearchResponse>['onmessage'] = null;
    onerror: WorkerPort<SearchRequest, SearchResponse>['onerror'] = null;
    constructor() { workers.push(this); this.jobs = []; }
    postMessage(job: SearchRequest) { this.jobs.push(job); }
    terminate() { this.terminated = true; }
    send(data: SearchResponse extends infer R ? R extends SearchResponse ? Omit<R, 'id'> : never : never) { this.onmessage?.({ data: { id: this.jobs[0]!.id, ...data } }); }
  }
  const copied: string[] = []; let clipboardFailure = false, delayCopy = false, finishCopy: (() => void) | undefined;
  const clipboard = { async writeText(value: string) {
    if (clipboardFailure) throw new Error('Clipboard denied');
    copied.push(value);
    if (delayCopy) await new Promise<void>(resolve => { finishCopy = resolve; });
  } };
  const globals = { document: window.document, navigator: { clipboard }, MutationObserver: window.MutationObserver, Worker: FakeWorker, ImageData };
  const previous = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  let page: ReturnType<typeof createBiomeFinder> | null = null;
  const q = createQuery(window.document);
  const submit = () => q('dialog form', 'form')!.dispatchEvent(new window.Event('submit', { cancelable: true }));
  try {
    page = createBiomeFinder(q('main', 'main')!);
    q('[data-biome="3"]')!.click();
    assert(q('dialog', 'dialog')!.open); assert.equal(q('dialog h2 span')!.textContent!, 'Wüste');
    assert(!q('.start-biome-preview')!.hidden);
    assert.equal(q('.start-biome-preview')!.closest('[hidden]'), null);
    assert(q('.start-biome-preview')!.hasAttribute('data-empty'));
    assert.match(q('.start-biome-preview-status')!.textContent!, /Seed finden/);
    assert(q('.start-biome-result')!.hidden);
    assert(q('.start-biome-field-label .fa-cube')!);
    assert(q('[data-start="find"] .fa-magnifying-glass')!);
    assert(!q('.start-biome-awaiting')!.hidden);
    assert.equal(q('dialog [name="version"]', 'select')!.value, '26.3');
    assert.equal(q('dialog [name="world"]', 'select')!.value, 'standard');
    assert.equal(q('dialog select[name="biomeSize"]', 'select')!.value, 'medium');
    assert.equal(q('[name="biomeSize"] option:checked', 'option')!.textContent!, 'Mittel (128)');
    q('[name="world"]', 'select')!.value = 'large';
    q('[name="world"]', 'select')!.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.equal(q('[name="biomeSize"] option:checked', 'option')!.textContent!, 'Mittel (512)');
    assert.match(q('[name="biomeSize"]', 'select')!.title, /512/);
    q('[name="world"]', 'select')!.value = 'standard';
    q('[name="world"]', 'select')!.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.equal(q('[name="biomeSize"] option:checked', 'option')!.textContent!, 'Mittel (128)');
    assert.equal(q('[data-start="advanced"]')!, null);
    q('[name="biomeSize"]', 'select')!.value = 'large';
    q('[name="biomeSize"]', 'select')!.dispatchEvent(new window.Event('change', { bubbles: true }));
    submit(); const first = workers.at(-1)!;
    assert.equal((first.jobs[0]!.type === 'search' ? first.jobs[0]!.biome : undefined), 2); assert(q('dialog select', 'select')!.disabled);
    assert.equal((first.jobs[0]!.type === 'search' ? first.jobs[0]!.size : undefined), 'large');
    assert(q('[name="biomeSize"]', 'select')!.disabled);
    first.send({ type: 'progress', attempts: 456 }); assert.match(q('.start-biome-status')!.textContent!, /456/);
    q('[data-start="cancel"]')!.click(); assert(first.terminated); assert(!q('dialog select', 'select')!.disabled);
    assert(q('.start-biome-preview')!.hasAttribute('data-empty'));
    assert.match(q('.start-biome-preview-status')!.textContent!, /abgebrochen/);
    const result: SearchResult = { config: { seed: '-9223372036854775808', version: '26.3', large: false }, spawn: { x: -24, z: 40 }, biome: 2, attempts: 1, size: null };
    first.send({ type: 'found', result }); assert(q('.start-biome-result')!.hidden);
    submit(); const second = workers.at(-1)!; second.send({ type: 'found', result });
    assert.equal(q('.start-biome-seed', 'input')!.value, result.config.seed);
    assert.equal(q('.start-biome-seed', 'input')!.tagName, 'INPUT');
    assert(q('.start-biome-seed', 'input')!.readOnly);
    assert.equal(q('.start-biome-coordinates')!, null);
    assert.equal(second.jobs.at(-1)!.type, 'preview');
    assert.equal(q('[data-start="open"]', 'a')!.getAttribute('href'), explorerLink(result.config));
    second.send({ type: 'error', phase: 'preview' }); assert(second.terminated);
    assert(!q('[data-start="preview"]')!.hidden); assert(!q('.start-biome-result')!.hidden);
    q('[data-start="preview"]')!.click(); const retry = workers.at(-1)!;
    assert.deepEqual((retry.jobs[0]!.type === 'preview' ? retry.jobs[0]!.result : undefined), result);
    retry.send({ type: 'preview', ids: new Uint16Array(512 * 256), width: 512, height: 256, pin: { x: .5, z: .5 } });
    assert(retry.terminated); assert(!q('dialog canvas', 'canvas')!.hidden); assert(!q('.start-biome-pin')!.hidden);
    assert(!q('.start-biome-preview')!.hasAttribute('data-empty'));
    assert(q('.start-biome-awaiting')!.hidden);
    q('.start-biome-seed', 'input')!.click(); await new Promise<void>(resolve => setTimeout(resolve, 0));
    assert.deepEqual(copied, [result.config.seed]);
    assert.equal(q('.start-biome-copy-feedback')!.textContent!, 'Kopiert');
    assert(q('.start-biome-copy .fa-check')!);
    clipboardFailure = true; q('.start-biome-copy', 'button')!.click(); await new Promise<void>(resolve => setTimeout(resolve, 0));
    assert.equal(q('.start-biome-copy-feedback')!.textContent!, 'Fehlgeschlagen');
    assert(!q('.start-biome-copy', 'button')!.disabled);
    clipboardFailure = false;
    assert.equal(q('dialog canvas', 'canvas')!.tabIndex, -1); assert.equal(q('dialog [data-action="in"]')!, null);
    window.document.documentElement.lang = 'en'; await new Promise<void>(resolve => setTimeout(resolve, 0));
    assert.equal(q('dialog h2 span')!.textContent!, 'Desert'); assert.equal(q('[data-start="find"]')!.textContent!, 'Find another seed');
    assert(q('[data-start="find"] .fa-rotate-right')!);
    assert(q('[data-start="open"] .fa-arrow-up-right-from-square')!);
    assert.equal(q('.start-biome-copy-feedback')!.textContent!, 'Copy failed');
    submit(); const third = workers.at(-1)!;
    assert(third.jobs[0]!.type === 'search' && third.jobs[0]!.excluded.includes(result.config.seed));
    q('dialog', 'dialog')!.dispatchEvent(new window.Event('cancel', { cancelable: true }));
    assert(third.terminated); assert(!q('dialog', 'dialog')!.open); assert.equal(window.document.activeElement, q('[data-biome="3"]')!);
    q('[data-biome="4"]')!.click(); assert.equal(q('[name="biomeSize"]', 'select')!.value, 'medium'); submit(); const fourth = workers.at(-1)!;
    fourth.send({ type: 'error', phase: 'search' }); assert.match(q('.start-biome-status')!.textContent!, /failed/);
    submit(); const fifth = workers.at(-1)!; fifth.send({ type: 'found', result });
    delayCopy = true; q('.start-biome-copy', 'button')!.click(); assert(q('.start-biome-copy', 'button')!.disabled);
    q('dialog [name="world"]', 'select')!.value = 'large'; q('dialog form', 'form')!.dispatchEvent(new window.Event('change'));
    assert(finishCopy); finishCopy(); await new Promise<void>(resolve => setTimeout(resolve, 0));
    assert.equal(q('.start-biome-copy-feedback')!.textContent!, '');
    assert(fifth.terminated); assert(q('.start-biome-result')!.hidden);
    submit(); assert.equal(workers.at(-1)!.jobs.some(job => job.type === 'search' && job.config.large), true);
    // Every visible card must send its own stable biome ID, including new cards.
    for (const card of window.document.querySelectorAll<HTMLElement>('.biome-card')) {
      query(card, '.biome-card-trigger').click();
      submit();
      const job = workers.at(-1)!.jobs[0]!;
      assert.equal(job.type, 'search');
      if (job.type === 'search') assert.equal(job.biome, Number(card.dataset.biomeId));
    }
    q('.biome-card[data-biome-id="4"] .biome-card-trigger')!.click();
    q('dialog [name="version"]', 'select')!.value = '1.18.2';
    q('dialog [name="version"]', 'select')!.dispatchEvent(new window.Event('change', { bubbles: true }));
    submit(); assert(workers.at(-1)!.jobs[0]!.type === 'search');
    q('.biome-card[data-biome-id="184"] .biome-card-trigger')!.click();
    assert.equal(q('dialog [name="version"]', 'select')!.value, '1.19');
    assert.equal(q('dialog option[value="1.18.2"]', 'option'), null);
    const workerCount = workers.length;
    q('dialog [name="version"]', 'select')!.value = '1.18.2';
    submit(); assert.equal(workers.length, workerCount);
    assert.equal(q('dialog [name="version"]', 'select')!.value, '1.19');
    for (const [biome, oldest, absent] of [[185, '1.20', '1.19.4'], [186, '1.21.4', '1.21.3'], [4, '1.18.2', '1.18.1']] as const) {
      q(`.biome-card[data-biome-id="${biome}"] .biome-card-trigger`)!.click();
      const versions = q('dialog [name="version"]', 'select')!;
      assert.equal(versions.options[versions.options.length - 1]!.value, oldest);
      assert.equal(q(`dialog option[value="${absent}"]`, 'option'), null);
      assert([...versions.options].every(option => !option.disabled));
    }
    assert.equal(q('dialog [name="version"]', 'select')!.options.length, 30);
    page.dispose(); page = null; assert(workers.at(-1)!.terminated); assert.equal(q('dialog', 'dialog')!, null);
  } finally {
    page?.dispose(); dom.window.close();
    for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
  }
});
