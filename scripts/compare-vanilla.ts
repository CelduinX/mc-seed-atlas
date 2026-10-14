import { readFileSync, writeFileSync } from 'node:fs';
import { loadEngine } from '../src/wasm-adapter.ts';
import { seedWords, VERSIONS } from '../src/explorer-core.ts';
import { BIOMES } from '../src/biome-palette.ts';
const engine = await loadEngine('biomes');
let total = 0, mismatches = [];
const fixtures = [];
for (const [versionIndex, version] of VERSIONS.entries()) {
  if (process.argv.length > 2 && !process.argv.slice(2).includes(version)) continue;
  let previous = '';
  const lines = readFileSync(`.cache/vanilla/${version}.csv`, 'utf8').trim().split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    const [seed, largeText, xText, zText, biome] = line.split(',');
    if (seed === undefined || biome === undefined || largeText === undefined || xText === undefined || zText === undefined) throw new Error('Malformed oracle row');
    const large = Number(largeText), x = Number(xText), z = Number(zText), key = `${seed}:${large}`;
    if (key !== previous) { engine._atlas_init(versionIndex, large, ...seedWords(seed)); previous = key; }
    const id = engine._atlas_point(x, z); const actual = `minecraft:${BIOMES.get(id)?.key}`;
    if (actual !== biome) mismatches.push({ version, seed, large, x, z, biome, actual, id });
    if (index % 97 === 0 || x === -128 || x === 127 || (x >= 498 && x <= 500 && z === -129)) fixtures.push({ version, seed, large, x, z, biome });
    total++;
  }
  console.log(`${version}: ${lines.length} samples checked`);
}
console.log(JSON.stringify({ total, mismatchCount: mismatches.length, examples: mismatches.slice(0, 20) }, null, 2));
writeFileSync('.cache/vanilla/comparison.json', JSON.stringify({ total, mismatches }, null, 2));
if (!mismatches.length && fixtures.length) {
  const previous = JSON.parse(readFileSync('tests/vanilla-fixtures.json', 'utf8'));
  const checked = new Set(fixtures.map(sample => sample.version));
  const retained = previous.samples.filter((sample: { version: string }) => !checked.has(sample.version as typeof VERSIONS[number]));
  writeFileSync('tests/vanilla-fixtures.json', JSON.stringify({ source: 'Official SHA1-verified Java release server jars and mappings via scripts/VanillaOracle.java at Y=64; independent point queries with pre-1.19.3 RTree last-result cache cleared (MC-241546)', totalValidated: process.argv.length > 2 ? Math.max(previous.totalValidated, total) : total, samples: [...retained, ...fixtures] }, null, 2));
}
process.exitCode = mismatches.length ? 1 : 0;
