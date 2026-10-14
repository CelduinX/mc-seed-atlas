import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VERSIONS, RELEASES, biomeAvailable } from '../src/versions.ts';
import { startBiomeAvailable, explorerLink, explorerRoute } from '../src/start-biome-core.ts';
import { loadEngine } from '../src/wasm-adapter.ts';
import { findSeed } from '../src/start-biome-worker.ts';

test('frontend releases and compiled WASM version indices stay aligned', () => {
  const header = readFileSync(new URL('../wasm/versions.h', import.meta.url), 'utf8');
  assert.equal(new Set(VERSIONS).size, 30);
  assert(header.includes(`{${RELEASES.map(([, mc]) => mc).join(', ')}}`));
  assert(header.includes(`{${VERSIONS.map(v => JSON.stringify(v)).join(', ')}}`));
  for (const version of VERSIONS) {
    const config = { version, seed: '-9223372036854775808', large: true };
    assert.deepEqual(explorerRoute(explorerLink(config)).config, config);
  }
});

test('biome availability follows release boundaries and workers reject impossible searches', async () => {
  for (const [id, before, after] of [[184, '1.18.2', '1.19'], [183, '1.18.2', '1.19'], [185, '1.19.4', '1.20'], [186, '1.21.3', '1.21.4'], [187, '26.1.2', '26.2'], [188, '26.2', '26.3']] as const) {
    assert(!biomeAvailable(id, before)); assert(biomeAvailable(id, after));
  }
  const engine = await loadEngine('biomes');
  for (const [biome, version] of [[184, '1.18.2'], [185, '1.19'], [186, '1.21.3']] as const) {
    assert(!startBiomeAvailable(biome, version));
    await assert.rejects(findSeed(engine, { version, large: false }, biome, { start: '0' }), /Unsupported configuration/);
  }
  for (const version of ['1.18.2', '1.19.3', '1.20', '1.21.4'] as const) for (const large of [false, true]) {
    const found = await findSeed(engine, { version, large }, 4, { start: '0' });
    assert.equal(engine._atlas_point(found.spawn.x, found.spawn.z), 4);
  }
  assert.equal(engine._atlas_init(-1, 0, 0, 0), -1);
  assert.equal(engine._atlas_init(VERSIONS.length, 0, 0, 0), -1);
});
