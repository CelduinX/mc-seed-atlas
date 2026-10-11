import type { BiomeEngine, Position, BiomeSize, WorldSettings, SearchResult, SearchRequest, SearchResponse } from './types.ts';
import { loadEngine, workerScope } from './wasm-adapter.ts';
const scope = workerScope<SearchRequest, SearchResponse>();
import { randomSeed, seedWords, VERSIONS } from './explorer-core.ts';
import { START_BIOME_IDS, BIOME_SIZES, MIN_BIOME_SHARE, biomeSizeRadius } from './start-biome-core.ts';

let engine: BiomeEngine | undefined, result: SearchResult | undefined;
async function load() {
  if (!engine) {
    engine = await loadEngine('biomes');
  }
  return engine;
}
export function biomeSizeMatches(engine: Pick<BiomeEngine, '_atlas_point'>, spawn: Position, biome: number, size: BiomeSize, large = false) {
  const radius = biomeSizeRadius(size, large);
  // Evenly spaced block-level queries at Y=64, on a circular 16-block grid.
  let matching = 0, total = 0;
  for (let z = -radius; z <= radius; z += 16) for (let x = -radius; x <= radius; x += 16) {
    if (x * x + z * z > radius * radius) continue;
    const id = engine._atlas_point(spawn.x + x, spawn.z + z);
    if (id < 0) throw new Error('Biome area query failed');
    total++; if (id === biome) matching++;
  }
  return matching / total >= MIN_BIOME_SHARE;
}
export async function findSeed(engine: BiomeEngine, config: WorldSettings, biome: number, { start = randomSeed(), excluded = [], progress = () => {}, size = null }: { start?: string; excluded?: string[]; progress?: (attempts: number) => void; size?: BiomeSize | null } = {}): Promise<SearchResult> {
  if (!VERSIONS.includes(config.version) || typeof config.large !== 'boolean' || !START_BIOME_IDS.includes(biome)) throw new Error('Unsupported configuration');
  if (size !== null && !Object.hasOwn(BIOME_SIZES, size)) throw new Error('Unsupported biome size');
  let candidate = BigInt(start), attempts = 0, last = performance.now();
  const skip = new Set(excluded);
  for (;;) {
    const seed = BigInt.asIntN(64, candidate++).toString();
    if (skip.has(seed)) continue;
    if (engine._atlas_init(VERSIONS.indexOf(config.version), Number(config.large), ...seedWords(seed))) throw new Error('Initialization failed');
    const pointer = engine._atlas_spawn();
    const x = engine.HEAP32[pointer / 4]!, z = engine.HEAP32[pointer / 4 + 1]!;
    const actual = engine._atlas_point(x, z);
    if (actual < 0) throw new Error('Biome query failed');
    attempts++;
    if (actual === biome && (size === null || biomeSizeMatches(engine, { x, z }, biome, size, config.large))) return { config: { ...config, seed }, spawn: { x, z }, biome, attempts, size };
    if (performance.now() - last >= 250) {
      progress(attempts); await new Promise<void>(resolve => setTimeout(resolve, 0)); last = performance.now();
    }
  }
}
export function previewIds(engine: BiomeEngine, found: SearchResult) {
  const width = 512, height = 256, scale = 4;
  const x = Math.floor(found.spawn.x / scale) - width / 2, z = Math.floor(found.spawn.z / scale) - height / 2;
  const ids = new Uint16Array(width * height);
  for (let row = 0; row < height; row += 128) for (let col = 0; col < width; col += 128) {
    const pointer = engine._atlas_tile(scale, x + col, z + row, 128, 128);
    if (!pointer) throw new Error('Preview failed');
    const tile = engine.HEAP32.subarray(pointer / 4, pointer / 4 + 128 * 128);
    for (let dy = 0; dy < 128; dy++) ids.set(tile.subarray(dy * 128, (dy + 1) * 128), (row + dy) * width + col);
  }
  return { ids, width, height, pin: { x: (found.spawn.x / scale - x) / width, z: (found.spawn.z / scale - z) / height } };
}
if (scope) scope.onmessage = async ({ data }) => {
  const { id, type } = data;
  try {
    const engine = await load();
    if (type === 'search') {
      result = await findSeed(engine, data.config, data.biome, { excluded: data.excluded, size: data.size ?? 'medium', progress: attempts => scope.postMessage({ type: 'progress', id, attempts }) });
      scope.postMessage({ type: 'found', id, result });
    } else if (type === 'preview' && (result || data.result)) {
      if (data.result) {
        result = data.result;
        if (engine._atlas_init(VERSIONS.indexOf(result.config.version), Number(result.config.large), ...seedWords(result.config.seed))) throw new Error('Initialization failed');
      }
      const preview = previewIds(engine, result!);
      scope.postMessage({ type: 'preview', id, ...preview }, [preview.ids.buffer]);
    }
  } catch { scope.postMessage({ type: 'error', id, phase: type }); }
};
