import type { WorldConfig, View, Scale, Tile, Version } from './types.ts';
export const VERSIONS = ['26.1', '26.1.1', '26.1.2', '26.2', '26.3'] as const;
export const LIMIT = 10000;
export const TILE = 128;
export function parseSeed(value: unknown) {
  const text = String(value).trim();
  if (!/^[+-]?\d+$/.test(text)) throw new Error('seed');
  const seed = BigInt(text);
  if (seed < -(1n << 63n) || seed >= (1n << 63n)) throw new Error('seed');
  return seed.toString();
}
export function seedWords(value: string): [number, number] {
  const bits = BigInt.asUintN(64, BigInt(value));
  return [Number(bits & 0xffffffffn), Number(bits >> 32n)];
}
export function randomSeed(cryptoApi: { getRandomValues(values: Uint32Array<ArrayBuffer>): Uint32Array<ArrayBuffer> } = globalThis.crypto) {
  const words = cryptoApi.getRandomValues(new Uint32Array(2));
  return BigInt.asIntN(64, (BigInt(words[1]!) << 32n) | BigInt(words[0]!)).toString();
}
export function sampling(blocksPerPixel: number): Scale {
  return blocksPerPixel >= 32 ? 64 : blocksPerPixel >= 8 ? 16 : blocksPerPixel >= 2 ? 4 : 1;
}
export function clampView(view: View, width: number, height: number) {
  const maximum = Math.max(1, 2 * LIMIT / Math.min(width, height));
  const bpp = Math.min(maximum, Math.max(0.125, view.bpp));
  const halfX = Math.min(LIMIT, width * bpp / 2);
  const halfZ = Math.min(LIMIT, height * bpp / 2);
  return { bpp, x: Math.max(-LIMIT + halfX, Math.min(LIMIT - halfX, view.x)), z: Math.max(-LIMIT + halfZ, Math.min(LIMIT - halfZ, view.z)) };
}
export function worldAt(view: View, width: number, height: number, x: number, y: number) {
  return { x: view.x + (x - width / 2) * view.bpp, z: view.z + (y - height / 2) * view.bpp };
}
export function zoomAt(view: View, width: number, height: number, x: number, y: number, factor: number) {
  const before = worldAt(view, width, height, x, y);
  const next = clampView({ ...view, bpp: view.bpp * factor }, width, height);
  next.x = before.x - (x - width / 2) * next.bpp;
  next.z = before.z - (y - height / 2) * next.bpp;
  return clampView(next, width, height);
}
export function tileKey(config: WorldConfig, scale: Scale, tx: number, tz: number) { return `${config.seed}:${config.version}:${config.large}:${scale}:${tx}:${tz}`; }
export function visibleTiles(view: View, width: number, height: number, scale: Scale, margin = 0) {
  const span = TILE * scale;
  const result: Tile[] = [];
  const minX = Math.max(-LIMIT, view.x - width * view.bpp / 2);
  const maxX = Math.min(LIMIT - 1, view.x + width * view.bpp / 2);
  const minZ = Math.max(-LIMIT, view.z - height * view.bpp / 2);
  const maxZ = Math.min(LIMIT - 1, view.z + height * view.bpp / 2);
  for (let tz = Math.max(Math.floor(-LIMIT / span), Math.floor(minZ / span) - margin); tz <= Math.min(Math.floor((LIMIT - 1) / span), Math.floor(maxZ / span) + margin); tz++) {
    for (let tx = Math.max(Math.floor(-LIMIT / span), Math.floor(minX / span) - margin); tx <= Math.min(Math.floor((LIMIT - 1) / span), Math.floor(maxX / span) + margin); tx++) result.push({ tx, tz, scale });
  }
  return result.sort((a, b) => Math.hypot((a.tx + .5) * span - view.x, (a.tz + .5) * span - view.z) - Math.hypot((b.tx + .5) * span - view.x, (b.tz + .5) * span - view.z));
}
export interface CacheResource { close?: () => void; width?: number; height?: number }
export interface CacheEntry { bytes: number; image?: CacheResource }
export class TileCache<Entry extends CacheEntry = CacheEntry> {
  limit: number; bytes: number; entries: Map<string, Entry>;
  constructor(limit = 64 * 1024 * 1024) { this.limit = limit; this.bytes = 0; this.entries = new Map(); }
  get(key: string) { const entry = this.entries.get(key); if (entry) { this.entries.delete(key); this.entries.set(key, entry); } return entry; }
  set(key: string, entry: Entry) {
    this.delete(key); this.entries.set(key, entry); this.bytes += entry.bytes;
    while (this.bytes > this.limit && this.entries.size) this.delete(this.entries.keys().next().value!);
  }
  delete(key: string) {
    const entry = this.entries.get(key); if (!entry) return;
    this.bytes -= entry.bytes;
    if (entry.image?.close) entry.image.close();
    else if (entry.image) { entry.image.width = 0; entry.image.height = 0; }
    this.entries.delete(key);
  }
  clear() { for (const key of this.entries.keys()) this.delete(key); }
}

export function isVersion(value: unknown): value is Version { return VERSIONS.some(version => version === value); }
export function requireVersion(value: unknown): Version { if (!isVersion(value)) throw new Error('Unsupported version'); return value; }
