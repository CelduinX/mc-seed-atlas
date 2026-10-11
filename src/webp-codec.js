import factory from '@jsquash/webp/codec/enc/webp_enc.js';
import { defaultOptions } from '@jsquash/webp/meta.js';

let encoder;
export default async function encodeWebp(image) {
  if (!encoder) encoder = (async () => {
    let binary;
    if (import.meta.env) {
      const response = await fetch(new URL(`${import.meta.env.BASE_URL}wasm/webp.wasm`, self.location.origin));
      if (!response.ok) throw new Error('WebP encoder unavailable');
      binary = await response.arrayBuffer();
    } else {
      const moduleName = 'node:fs/promises';
      const { readFile } = await import(/* @vite-ignore */ moduleName);
      binary = await readFile(new URL('../public/wasm/webp.wasm', import.meta.url));
    }
    return factory({ wasmBinary: binary });
  })();
  const module = await encoder;
  const result = module.encode(image.data, image.width, image.height, { ...defaultOptions, lossless: 1, quality: 75, method: 3, exact: 1 });
  if (!result) throw new Error('WebP encoding failed');
  return result.slice();
}
