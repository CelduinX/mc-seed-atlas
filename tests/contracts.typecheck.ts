import type { BiomeSize, ExportRequest, MapRequest, MapResponse, SearchRequest, SearchResponse, Version, WorkerPort } from '../src/types.ts';

// Compiled by typecheck, never executed. Every expect-error must remain an error.
export function checkContracts(map: WorkerPort<MapRequest, MapResponse>, search: WorkerPort<SearchRequest, SearchResponse>, exportWorker: WorkerPort<ExportRequest, unknown>): void {
  const version: Version = '26.3';
  const size: BiomeSize = 'medium';
  map.postMessage({ type: 'init', id: 1, generation: 1, config: { seed: '-9223372036854775808', version, large: false } });
  search.postMessage({ type: 'search', id: 2, config: { version, large: true }, biome: 4, excluded: [], size });
  exportWorker.postMessage({ type: 'export', id: 3, generation: 1, config: { seed: '0', version, large: false }, region: { x: 0, z: 0, width: 128, height: 128, scale: 4 } });
  // @ts-expect-error Unsupported release.
  const invalidVersion: Version = '1.18.1';
  // @ts-expect-error Unsupported biome size.
  const invalidSize: BiomeSize = 'huge';
  // @ts-expect-error Init requires a complete world configuration.
  map.postMessage({ type: 'init', id: 1, generation: 1 });
  // @ts-expect-error Tile jobs require world-aligned tile coordinates.
  map.postMessage({ type: 'tile', id: 1, generation: 1, key: 'missing-coordinates' });
  // @ts-expect-error A response cannot be sent as a request.
  map.postMessage({ type: 'ready', id: 1, generation: 1 });
  // @ts-expect-error Seeds must preserve their exact decimal representation.
  map.postMessage({ type: 'init', id: 1, generation: 1, config: { seed: 9007199254740993, version, large: false } });
  // @ts-expect-error Search and map workers use different protocols.
  search.postMessage({ type: 'point', id: 1, generation: 1, x: 0, z: 0 });
  // @ts-expect-error Unknown sampling scales cannot be exported.
  exportWorker.postMessage({ type: 'export', id: 3, generation: 1, config: { seed: '0', version, large: false }, region: { x: 0, z: 0, width: 128, height: 128, scale: 2 } });
  void invalidVersion; void invalidSize;
}
