import { LIMIT } from './explorer-core.js';

// Pixels use the same world-aligned sampling grid as map tiles. Edge samples
// may cover a partial cell; the geographic selection itself stays bounded.
export function exportRegion(view, width, height, scale) {
  const minX = Math.max(-LIMIT, view.x - width * view.bpp / 2);
  const minZ = Math.max(-LIMIT, view.z - height * view.bpp / 2);
  const maxX = Math.min(LIMIT, view.x + width * view.bpp / 2);
  const maxZ = Math.min(LIMIT, view.z + height * view.bpp / 2);
  const x = Math.floor(minX / scale), z = Math.floor(minZ / scale);
  return { x, z, width: Math.ceil(maxX / scale) - x, height: Math.ceil(maxZ / scale) - z, scale, minX, minZ, maxX, maxZ };
}
export function exportFilename(config, region, format = 'webp') {
  if (!['webp', 'jpg'].includes(format)) throw new Error('Unsupported image format');
  return `seed-${config.seed}_${config.version}_${config.large ? 'large-biomes' : 'standard'}_x${Math.floor(region.minX)}-z${Math.floor(region.minZ)}-to-x${Math.ceil(region.maxX)}-z${Math.ceil(region.maxZ)}_${region.scale}bpp.${format}`;
}
