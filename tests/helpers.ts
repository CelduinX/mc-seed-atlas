import { query } from '../src/dom.ts';
import type { MapRequest, MapResponse, WorkerPort, Version } from '../src/types.ts';
import { requireVersion } from '../src/explorer-core.ts';

export function optionalQuery(root: ParentNode, selector: string): HTMLElement | null;
export function optionalQuery<Tag extends keyof HTMLElementTagNameMap>(root: ParentNode, selector: string, tag: Tag): HTMLElementTagNameMap[Tag] | null;
export function optionalQuery(root: ParentNode, selector: string, tag?: keyof HTMLElementTagNameMap): HTMLElement | null {
  if (!root.querySelector(selector)) return null;
  return tag ? query(root, selector, tag) : query(root, selector);
}

export function createQuery(root: ParentNode) {
  function find(selector: string): HTMLElement | null;
  function find<Tag extends keyof HTMLElementTagNameMap>(selector: string, tag: Tag): HTMLElementTagNameMap[Tag] | null;
  function find(selector: string, tag?: keyof HTMLElementTagNameMap): HTMLElement | null {
    return tag ? optionalQuery(root, selector, tag) : optionalQuery(root, selector);
  }
  return find;
}

export class MapWorker implements WorkerPort<MapRequest, MapResponse> {
  messages: MapRequest[] = [];
  onmessage: WorkerPort<MapRequest, MapResponse>['onmessage'] = null;
  onerror: WorkerPort<MapRequest, MapResponse>['onerror'] = null;
  terminated = false;
  postMessage(message: MapRequest) { this.messages.push(message); }
  terminate() { this.terminated = true; }
  last() { const job = this.messages.at(-1); if (!job) throw new Error('No worker job'); return job; }
  respond(type: 'ready' | 'tile' | 'spawn') {
    const job = this.last();
    if (type === 'ready') this.onmessage?.({ data: { type, id: job.id, generation: job.generation } });
    else if (type === 'spawn') this.onmessage?.({ data: { type, id: job.id, generation: job.generation, x: 8, z: 8 } });
    else {
      if (job.type !== 'tile') throw new Error('Expected tile request');
      this.onmessage?.({ data: { ...job, ids: new Uint16Array(128 * 128) } });
    }
  }
}

export interface VanillaSample { seed: string; version: Version; large: number; x: number; z: number; biome: string }
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected object');
  return value as Record<string, unknown>;
}
export function samples(value: unknown): VanillaSample[] {
  if (!Array.isArray(value)) throw new Error('Expected samples');
  return value.map((item: unknown) => {
    const sample = object(item);
    if (typeof sample.seed !== 'string' || typeof sample.large !== 'number' || typeof sample.x !== 'number' || typeof sample.z !== 'number') throw new Error('Invalid sample');
    return { seed: sample.seed, version: requireVersion(sample.version), large: sample.large, x: sample.x, z: sample.z, biome: typeof sample.biome === 'string' ? sample.biome : '' };
  });
}
