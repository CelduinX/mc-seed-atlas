import { samples, object } from './helpers.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadEngine } from '../src/wasm-adapter.ts';
import { seedWords, VERSIONS } from '../src/explorer-core.ts';
import { BIOMES } from '../src/biome-palette.ts';

test('WASM spawn estimates match independent native Cubiomes for every release and world type', async () => {
  const fixtures = samples(JSON.parse(readFileSync(new URL('./spawn-fixtures.json', import.meta.url), 'utf8')) as unknown);
  const engine = await loadEngine('biomes'); assert.equal(fixtures.length, 50);
  for (const sample of fixtures) {
    engine._atlas_init(VERSIONS.indexOf(sample.version), sample.large, ...seedWords(sample.seed));
    const pointer = engine._atlas_spawn();
    assert.deepEqual([...engine.HEAP32.slice(pointer / 4, pointer / 4 + 2)], [sample.x, sample.z], JSON.stringify(sample));
  }
});

test('all pinned release and world-type fixtures match independent Vanilla Java results', async () => {
  const fixtures = object(JSON.parse(readFileSync(new URL('./vanilla-fixtures.json', import.meta.url), 'utf8')) as unknown);
  const engine = await loadEngine('biomes'); let previous = '';
  for (const sample of samples(fixtures.samples)) {
    const key = `${sample.version}:${sample.seed}:${sample.large}`;
    if (key !== previous) { assert.equal(engine._atlas_init(VERSIONS.indexOf(sample.version), sample.large, ...seedWords(sample.seed)), 0); previous = key; }
    const id = engine._atlas_point(sample.x, sample.z);
    assert.equal(`minecraft:${BIOMES.get(id)?.key}`, sample.biome, JSON.stringify(sample));
  }
  assert(typeof fixtures.totalValidated === 'number' && fixtures.totalValidated >= 147360);
});

test('block tiles agree with exact point queries across negative tile boundaries', async () => {
  const engine = await loadEngine('biomes');
  for (let version = 0; version < VERSIONS.length; version++) for (const large of [0, 1]) {
    engine._atlas_init(version, large, ...seedWords('-9223372036854775808'));
    for (const startX of [-128, 0, 128]) {
      const pointer = engine._atlas_tile(1, startX, -128, 128, 128);
      assert(pointer > 0); const ids = engine.HEAP32.slice(pointer / 4, pointer / 4 + 128 * 128);
      for (let z = 0; z < 128; z += 7) for (let x = 0; x < 128; x += 7) assert.equal(ids[z * 128 + x], engine._atlas_point(startX + x, -128 + z));
    }
    for (const scale of [4, 16, 64]) assert(engine._atlas_tile(scale, -128, 0, 128, 128) > 0);
  }
});
