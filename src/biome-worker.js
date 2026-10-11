import { seedWords, VERSIONS, TILE } from './explorer-core.js';
let engine;
let generation = -1;
let messages = Promise.resolve();
async function handle({ data }) {
  const { type, id } = data;
  try {
    if (type === 'init') {
      if (!engine) {
        const url = import.meta.env
          ? new URL(`${import.meta.env.BASE_URL}wasm/biomes.js`, self.location.origin)
          : new URL('../public/wasm/biomes.js', import.meta.url);
        const { default: createEngine } = await import(/* @vite-ignore */ url.href);
        engine = await createEngine({ locateFile: file => new URL(file, url).href });
      }
      const [low, high] = seedWords(data.config.seed);
      if (engine._atlas_init(VERSIONS.indexOf(data.config.version), Number(data.config.large), low, high)) throw new Error('Unsupported configuration');
      generation = data.generation;
      self.postMessage({ type: 'ready', generation, id });
      return;
    }
    if (!engine || generation !== data.generation) throw new Error('Stale configuration');
    if (type === 'spawn') {
      const pointer = engine._atlas_spawn();
      const [x, z] = engine.HEAP32.slice(pointer / 4, pointer / 4 + 2);
      self.postMessage({ ...data, x, z });
    } else if (type === 'point') {
      const biome = engine._atlas_point(data.x, data.z);
      if (biome < 0) throw new Error('Biome query failed');
      self.postMessage({ ...data, biome });
    } else if (type === 'tile') {
      const pointer = engine._atlas_tile(data.scale, data.tx * TILE, data.tz * TILE, TILE, TILE);
      if (!pointer) throw new Error('Tile generation failed');
      const ids = new Uint16Array(engine.HEAP32.subarray(pointer / 4, pointer / 4 + TILE * TILE));
      self.postMessage({ ...data, ids }, [ids.buffer]);
    }
  } catch (error) { self.postMessage({ type: 'error', generation: data.generation, id, message: error.message }); }
}
self.onmessage = event => { messages = messages.then(() => handle(event)); };
