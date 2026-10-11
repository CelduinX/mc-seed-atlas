import type { WebpImage } from './types.ts';
import factory from '@jsquash/webp/codec/enc/webp_enc.js';
import { defaultOptions } from '@jsquash/webp/meta.js';

interface WebpModule { encode(data: Uint8Array<ArrayBuffer>, width: number, height: number, options: typeof defaultOptions): Uint8Array | null }
// The package's factory declaration references ambient Emscripten types.
const createEncoder = factory as unknown as (options: { wasmBinary: ArrayBuffer | Uint8Array<ArrayBuffer> }) => Promise<WebpModule>;
let encoder: Promise<WebpModule> | undefined;
export default async function encodeWebp(image: WebpImage) {
  if (!encoder) encoder = (async () => {
    let binary;
    if (import.meta.env) {
      const response = await fetch(new URL(`${import.meta.env.BASE_URL}wasm/webp.wasm`, self.location.origin));
      if (!response.ok) throw new Error('WebP encoder unavailable');
      binary = await response.arrayBuffer();
    } else {
      const moduleName = 'node:fs/promises';
      const { readFile } = await import(/* @vite-ignore */ moduleName) as typeof import('node:fs/promises');
      binary = await readFile(new URL('../public/wasm/webp.wasm', import.meta.url));
    }
    return createEncoder({ wasmBinary: binary });
  })();
  const module = await encoder;
  const result = module.encode(image.data, image.width, image.height, { ...defaultOptions, lossless: 1, quality: 75, method: 3, exact: 1 });
  if (!result) throw new Error('WebP encoding failed');
  return new Uint8Array(result);
}
