import type { BiomeSize, WorldConfig } from './types.ts';
import { parseSeed, isVersion } from './explorer-core.ts';

// Broad surface biomes only: no shores, rivers, oceans, cave biomes or narrow
// transition biomes. High mountain biomes are unsuitable for our Y=64 check.
export const START_BIOME_IDS = [1, 4, 21, 2, 37, 38, 5, 27, 29, 155, 32, 160, 132, 168, 35, 129, 12, 30, 6, 184, 177, 185, 186, 3, 34, 131, 163, 36, 165];
export const BIOME_SIZES = Object.freeze({ small: 64, medium: 128, large: 256 });
export const MIN_BIOME_SHARE = .8;
export function biomeSizeRadius(size: BiomeSize, large = false) {
  if (!Object.hasOwn(BIOME_SIZES, size)) throw new Error('Unsupported biome size');
  // Large Biomes stretches the climate scale by four along X and Z.
  return BIOME_SIZES[size] * (large ? 4 : 1);
}
export function explorerLink(config: WorldConfig) {
  return `#/seed-explorer?${new URLSearchParams({ seed: config.seed, version: config.version, world: config.large ? 'large' : 'standard' })}`;
}
export function explorerRoute(hash: string): { path: string; config?: WorldConfig; error?: boolean } {
  const [path = '', query = ''] = hash.split('?');
  if (path !== '#/seed-explorer' || !query) return { path };
  try {
    const params = new URLSearchParams(query);
    const seed = parseSeed(params.get('seed'));
    const version = params.get('version'), world = params.get('world');
    if (!isVersion(version) || (world !== 'standard' && world !== 'large')) throw new Error('configuration');
    return { path, config: { seed, version, large: world === 'large' } };
  } catch { return { path, error: true }; }
}

export function requireBiomeSize(value: unknown): BiomeSize { if (value !== 'small' && value !== 'medium' && value !== 'large') throw new Error('Unsupported biome size'); return value; }
