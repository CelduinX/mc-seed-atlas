import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSeed, seedWords, randomSeed, clampView, zoomAt, worldAt, visibleTiles, tileKey, TileCache, VERSIONS } from '../src/explorer-core.js';
import { ExplorerPool } from '../src/explorer-pool.js';

test('64-bit seeds remain exact and invalid inputs are rejected', () => {
  for (const seed of ['0', '9223372036854775807', '-9223372036854775808', '-9007199254740993']) assert.equal(parseSeed(seed), seed);
  assert.equal(parseSeed(' +00012 '), '12');
  for (const seed of ['', ' ', '1.2', 'seed', '1e8', '9223372036854775808', '-9223372036854775809']) assert.throws(() => parseSeed(seed));
  assert.deepEqual(seedWords('-1'), [4294967295, 4294967295]);
  for (let i = 0; i < 100; i++) { const seed = randomSeed(); assert.equal(parseSeed(seed), seed); }
  assert.equal(randomSeed({ getRandomValues: values => { values.fill(0); return values; } }), '0');
  assert.equal(randomSeed({ getRandomValues: values => { values.fill(0xffffffff); return values; } }), '-1');
  assert.deepEqual(VERSIONS, ['26.1', '26.1.1', '26.1.2', '26.2', '26.3']);
});

test('zoom preserves pointer anchor and all movement respects bounds', () => {
  const view = { x: -123, z: 456, bpp: 4 };
  const before = worldAt(view, 1200, 600, 830, 320);
  const next = zoomAt(view, 1200, 600, 830, 320, .5);
  assert.deepEqual(worldAt(next, 1200, 600, 830, 320), before);
  const edge = clampView({ x: 100000, z: -100000, bpp: .01 }, 1200, 600);
  assert.equal(edge.bpp, .125); assert.equal(edge.x + 1200 * edge.bpp / 2, 10000); assert.equal(edge.z - 600 * edge.bpp / 2, -10000);
  const overview = clampView({ x: 3000, z: 100, bpp: 100000 }, 1200, 600);
  assert.equal(overview.x, 0); assert.equal(overview.z, 0);
});

test('tiles use floor division across negative coordinate seams', () => {
  const tiles = visibleTiles({ x: 0, z: 0, bpp: 1 }, 256, 256, 1);
  assert(tiles.some(t => t.tx === -1 && t.tz === -1));
  assert(tiles.some(t => t.tx === 0 && t.tz === 0));
  const config = { seed: '1', version: '26.1', large: false };
  assert.notEqual(tileKey(config, 1, 0, 0), tileKey({ ...config, large: true }, 1, 0, 0));
  assert(visibleTiles({ x: 0, z: 0, bpp: 50 }, 1200, 600, 64, 1).every(t => t.tx * 8192 < 10000 && (t.tx + 1) * 8192 > -10000));
});

test('LRU bounds memory and disposes evicted resources', () => {
  const closed = [];
  const cache = new TileCache(20);
  const entry = key => ({ bytes: 10, image: { close: () => closed.push(key) } });
  cache.set('a', entry('a')); cache.set('b', entry('b')); cache.get('a'); cache.set('c', entry('c'));
  assert.equal(cache.get('b'), undefined); assert.deepEqual(closed, ['b']); assert.equal(cache.bytes, 20);
  cache.clear(); assert.equal(cache.bytes, 0); assert.equal(closed.length, 3);
});

test('worker pool discards old configurations and superseded queued tiles', () => {
  const workers = [], results = [];
  const pool = new ExplorerPool(1, () => { const worker = { messages: [], postMessage(m) { this.messages.push(m); }, terminate() { this.terminated = true; } }; workers.push(worker); return worker; }, data => results.push(data), message => assert.fail(message));
  const worker = workers[0];
  pool.configure({ seed: '1' }); const old = worker.messages.at(-1);
  pool.configure({ seed: '2' }); const current = worker.messages.at(-1);
  worker.onmessage({ data: { ...old, type: 'ready' } }); assert.equal(results.length, 0);
  worker.onmessage({ data: { ...current, type: 'ready' } });
  pool.replaceTiles([{ key: 'a' }, { key: 'b' }]);
  const active = worker.messages.at(-1); pool.replaceTiles([{ key: 'c' }]);
  worker.onmessage({ data: { ...active, type: 'tile' } });
  assert.equal(worker.messages.at(-1).key, 'c'); assert(!worker.messages.some(m => m.key === 'b'));
  pool.point(1, 2); const pointId = pool.point(3, 4);
  worker.onmessage({ data: { ...worker.messages.at(-1), type: 'tile' } });
  assert.equal(worker.messages.at(-1).id, pointId);
  pool.dispose(); assert(worker.terminated);
});

test('spawn requests survive tile replacement and partial worker initialization cleans up', () => {
  const worker = { messages: [], postMessage(job) { this.messages.push(job); }, terminate() { this.terminated = true; } };
  const pool = new ExplorerPool(1, () => worker, () => {}, assert.fail);
  pool.configure({ seed: '0' });
  pool.spawn(); pool.replaceTiles([{ key: 'tile' }]);
  worker.onmessage({ data: { ...worker.messages.at(-1), type: 'ready' } });
  assert.equal(worker.messages.at(-1).type, 'spawn');
  worker.onmessage({ data: { ...worker.messages.at(-1), type: 'spawn', x: 8, z: 8 } });
  assert.equal(worker.messages.at(-1).key, 'tile'); pool.dispose();
  let count = 0; worker.terminated = false;
  assert.throws(() => new ExplorerPool(2, () => { if (count++) throw new Error('Unavailable worker'); return worker; }, () => {}, assert.fail));
  assert.equal(worker.terminated, true);
});
