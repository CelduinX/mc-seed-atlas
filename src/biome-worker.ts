import type { BiomeEngine, MapRequest, MapResponse } from './types.ts';
import { loadEngine, workerScope, errorMessage } from './wasm-adapter.ts';
const scope = workerScope<MapRequest, MapResponse>();
import { seedWords, VERSIONS, TILE } from './explorer-core.ts';
let engine: BiomeEngine | undefined;
let generation = -1;
let messages = Promise.resolve();
async function handle({ data }: { data: MapRequest }) {
  const { type, id } = data;
  try {
    if (type === 'init') {
      if (!engine) {
        engine = await loadEngine('biomes');
      }
      const [low, high] = seedWords(data.config.seed);
      if (engine._atlas_init(VERSIONS.indexOf(data.config.version), Number(data.config.large), low, high)) throw new Error('Unsupported configuration');
      generation = data.generation;
      scope?.postMessage({ type: 'ready', generation, id });
      return;
    }
    if (!engine || generation !== data.generation) throw new Error('Stale configuration');
    if (type === 'spawn') {
      const pointer = engine._atlas_spawn();
      const x = engine.HEAP32[pointer / 4]!, z = engine.HEAP32[pointer / 4 + 1]!;
      scope?.postMessage({ ...data, x, z });
    } else if (type === 'point') {
      const biome = engine._atlas_point(data.x, data.z);
      if (biome < 0) throw new Error('Biome query failed');
      scope?.postMessage({ ...data, biome });
    } else if (type === 'tile') {
      const pointer = engine._atlas_tile(data.scale, data.tx * TILE, data.tz * TILE, TILE, TILE);
      if (!pointer) throw new Error('Tile generation failed');
      const ids = new Uint16Array(engine.HEAP32.subarray(pointer / 4, pointer / 4 + TILE * TILE));
      scope?.postMessage({ ...data, ids }, [ids.buffer]);
    }
  } catch (error) { scope?.postMessage({ type: 'error', generation: data.generation, id, message: errorMessage(error) }); }
}
if (scope) scope.onmessage = event => { messages = messages.then(() => handle(event)); };
