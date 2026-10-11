import { seedWords, VERSIONS, TILE } from './explorer-core.js';
import { BIOMES } from './biome-palette.js';
import encodeWebp from './webp-codec.js';

export function selectSmallest(candidates) {
  const supported = candidates.filter(file => file.blob?.size && ['image/webp', 'image/jpeg'].includes(file.blob.type) && file.mime === file.blob.type);
  if (!supported.length) throw new Error('No supported encoded image');
  return supported.sort((a, b) => a.blob.size - b.blob.size)[0];
}

export async function runExport(data, send, load = async name => {
  const url = import.meta.env ? new URL(import.meta.env.BASE_URL + 'wasm/' + name + '.js', self.location.origin) : new URL('../public/wasm/' + name + '.js', import.meta.url);
  const { default: factory } = await import(/* @vite-ignore */ url.href);
  return factory({ locateFile: file => new URL(file, url).href });
}, webpEncode = encodeWebp) {
  const { config, region, generation, id } = data;
  const message = (type, extra = {}) => send({ type, generation, id, ...extra });
  let jpeg;
  try {
    const engine = await load('biomes'); jpeg = await load('jpeg');
    if (engine._atlas_init(VERSIONS.indexOf(config.version), Number(config.large), ...seedWords(config.seed))) throw new Error('Invalid configuration');
    const { width, height, x, z, scale } = region;
    if (![1, 4, 16, 64].includes(scale) || !Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 20002 || height > 20002) throw new Error('Invalid region');
    // Compare codecs using the same generated samples. Unusually large
    // viewports use streaming JPEG rather than allocating a large WebP raster.
    const raster = width <= 16383 && height <= 16383 && width * height <= 4 * 1024 * 1024 ? new Uint8Array(width * height * 4) : null;
    const chunks = [];
    jpeg.onJpegChunk = chunk => chunks.push(chunk);
    const row = jpeg._atlas_jpeg_begin(width, height);
    if (!row) throw new Error('JPEG initialization failed');
    const colours = new Uint8Array(256 * 3);
    for (const [biomeId, biome] of BIOMES) {
      const n = Number.parseInt(biome.color.slice(1), 16); colours.set([n >>> 16, (n >>> 8) & 255, n & 255], biomeId * 3);
    }
    const band = new Uint8Array(width * Math.min(TILE, height) * 3);
    message('progress', { value: 0 });
    for (let top = 0; top < height; top += TILE) {
      const rows = Math.min(TILE, height - top);
      for (let left = 0; left < width; left += TILE) {
        const cols = Math.min(TILE, width - left);
        const pointer = engine._atlas_tile(scale, x + left, z + top, cols, rows);
        if (!pointer) throw new Error('Biome generation failed');
        const ids = engine.HEAP32.subarray(pointer / 4, pointer / 4 + cols * rows);
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const source = ids[r * cols + c] * 3, target = (r * width + left + c) * 3;
          band[target] = colours[source]; band[target + 1] = colours[source + 1]; band[target + 2] = colours[source + 2];
          if (raster) {
            const pixel = ((top + r) * width + left + c) * 4;
            raster[pixel] = colours[source]; raster[pixel + 1] = colours[source + 1]; raster[pixel + 2] = colours[source + 2]; raster[pixel + 3] = 255;
          }
        }
      }
      for (let r = 0; r < rows; r++) {
        jpeg.HEAPU8.set(band.subarray(r * width * 3, (r + 1) * width * 3), row);
        if (jpeg._atlas_jpeg_row()) throw new Error('JPEG encoding failed');
      }
      message('progress', { value: .85 * (top + rows) / height });
    }
    if (jpeg._atlas_jpeg_finish()) throw new Error('JPEG finalization failed');
    const candidates = [{ blob: new Blob(chunks, { type: 'image/jpeg' }), mime: 'image/jpeg', format: 'jpg' }];
    if (raster) {
      try {
        const encoded = await webpEncode({ data: raster, width, height });
        candidates.push({ blob: new Blob([encoded], { type: 'image/webp' }), mime: 'image/webp', format: 'webp' });
      } catch { /* JPEG remains available if the optional WebP codec fails. */ }
    }
    const result = selectSmallest(candidates);
    message('file', { blob: result.blob }); message('progress', { value: 1 });
    message('done', { width, height, format: result.format, mime: result.mime, candidateBytes: Object.fromEntries(candidates.map(file => [file.format, file.blob.size])), bandBytes: band.byteLength, rasterBytes: raster?.byteLength || 0, wasmBytes: engine.HEAP32.buffer.byteLength + jpeg.HEAPU8.buffer.byteLength });
  } catch (error) { jpeg?._atlas_jpeg_abort(); message('error', { message: error.message }); }
}
if (typeof self !== 'undefined') self.onmessage = ({ data }) => runExport(data, message => self.postMessage(message));
