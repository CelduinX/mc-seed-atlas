import type { Version } from './versions.ts';
export type { Version } from './versions.ts';
export type BiomeSize = 'small' | 'medium' | 'large';
export type Language = 'de' | 'en';
export type LanguagePreference = Language | 'auto';
export type Scale = 1 | 4 | 16 | 64;
export interface WorldSettings { version: Version; large: boolean }
export interface WorldConfig extends WorldSettings { seed: string }
export interface Position { x: number; z: number }
export interface View extends Position { bpp: number }
export interface Tile { tx: number; tz: number; scale: Scale }
export interface KeyedTile extends Tile { key: string }
export interface RasterRegion extends Position { width: number; height: number; scale: Scale }
export interface ExportRegion extends RasterRegion { minX: number; minZ: number; maxX: number; maxZ: number }
export interface SearchResult { config: WorldConfig; spawn: Position; biome: number; attempts: number; size: BiomeSize | null }
export interface Preview { ids: Uint16Array<ArrayBuffer>; width: number; height: number; pin: Position }
interface Job { id: number; generation: number }
export type MapRequest = Job & (
  | { type: 'init'; config: WorldConfig }
  | { type: 'spawn' }
  | { type: 'point'; x: number; z: number }
  | ({ type: 'tile' } & KeyedTile)
);
export type MapResponse = Job & (
  | { type: 'ready' }
  | ({ type: 'spawn' } & Position)
  | ({ type: 'point'; biome: number } & Position)
  | ({ type: 'tile'; ids: Uint16Array<ArrayBuffer> } & KeyedTile)
  | { type: 'error'; message: string }
);
export type SearchRequest =
  | { type: 'search'; id: number; config: WorldSettings; biome: number; excluded: string[]; size: BiomeSize }
  | { type: 'preview'; id: number; result?: SearchResult };
export type SearchResponse =
  | { type: 'progress'; id: number; attempts: number }
  | { type: 'found'; id: number; result: SearchResult }
  | ({ type: 'preview'; id: number } & Preview)
  | { type: 'error'; id: number; phase: SearchRequest['type'] };
export interface ExportRequest extends Job { type: 'export'; config: WorldConfig; region: RasterRegion }
export interface ExportDone extends Job {
  type: 'done'; width: number; height: number; format: 'jpg' | 'webp'; mime: 'image/jpeg' | 'image/webp';
  candidateBytes: Record<string, number>; bandBytes: number; rasterBytes: number; wasmBytes: number;
}
export type ExportResponse = ExportDone | (Job & (
  | { type: 'progress'; value: number }
  | { type: 'file'; blob: Blob }
  | { type: 'error'; message: string }
));
// Browser workers and the Node test adapters share this small surface.
export interface WorkerPort<Request, Response> {
  onmessage: ((event: { data: Response }) => void) | null;
  onerror: ((event: { message: string }) => void) | null;
  postMessage(message: Request): void;
  terminate(): void;
}
export interface WorkerScope<Request, Response> {
  onmessage: ((event: { data: Request }) => void | Promise<void>) | null;
  postMessage(message: Response, transfer?: ArrayBuffer[]): void;
}
export interface BiomeEngine {
  HEAP32: Int32Array;
  _atlas_init(version: number, large: number, low: number, high: number): number;
  _atlas_point(x: number, z: number): number;
  _atlas_spawn(): number;
  _atlas_tile(scale: number, x: number, z: number, width: number, height: number): number;
}
export interface JpegEngine {
  HEAPU8: Uint8Array;
  onJpegChunk?: (chunk: Uint8Array<ArrayBuffer>) => void;
  _atlas_jpeg_begin(width: number, height: number): number;
  _atlas_jpeg_row(): number;
  _atlas_jpeg_finish(): number;
  _atlas_jpeg_abort(): void;
}
export interface EngineMap { biomes: BiomeEngine; jpeg: JpegEngine }
export type EngineLoader = <Name extends keyof EngineMap>(name: Name) => Promise<EngineMap[Name]>;
export interface WebpImage { data: Uint8Array<ArrayBuffer>; width: number; height: number }
export type WebpEncode = (image: WebpImage) => Promise<Uint8Array<ArrayBuffer> | ArrayBuffer>;
export interface BiomeCard { id: number; icon: string; color: string; image: string | null; categories: string[]; de: [string, string]; en: [string, string] }
