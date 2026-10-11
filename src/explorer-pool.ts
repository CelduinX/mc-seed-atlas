import type { WorldConfig, MapRequest, MapResponse, KeyedTile, WorkerPort } from './types.ts';
interface Slot { worker: WorkerPort<MapRequest, MapResponse>; busy: MapRequest | null; ready: boolean }
// One outstanding message per worker: initialization cannot race tile jobs.
export class ExplorerPool {
  generation: number; serial: number; queue: MapRequest[]; slots: Slot[]; disposed: boolean; onResult: (data: MapResponse) => void; onError: (message: string) => void;
  constructor(count: number, createWorker: () => WorkerPort<MapRequest, MapResponse>, onResult: (data: MapResponse) => void, onError: (message: string) => void) {
    this.generation = 0; this.serial = 0; this.queue = []; this.onResult = onResult; this.onError = onError; this.disposed = false;
    this.slots = [];
    try { for (let i = 0; i < count; i++) {
      const worker = createWorker(); const slot: Slot = { worker, busy: null, ready: false };
      this.slots.push(slot);
      worker.onmessage = ({ data }) => {
        if (this.disposed) return;
        if (data.generation !== this.generation || data.id !== slot.busy?.id) return;
        slot.busy = null;
        if (data.type === 'error') { this.onError(data.message); return; }
        if (data.type === 'ready') slot.ready = true;
        this.onResult(data); this.pump();
      };
      worker.onerror = event => { if (!this.disposed) this.onError(event.message || 'Worker failed'); };
    } } catch (error) { this.dispose(); throw error; }
  }
  configure(config: WorldConfig) {
    this.generation++; this.queue = [];
    for (const slot of this.slots) {
      slot.ready = false;
      const job: MapRequest = { type: 'init', config, generation: this.generation, id: ++this.serial };
      slot.busy = job; slot.worker.postMessage(job);
    }
  }
  replaceTiles(tiles: KeyedTile[]) {
    this.queue = this.queue.filter(job => job.type !== 'tile');
    const active = new Set(this.slots.map(slot => slot.busy?.type === 'tile' ? slot.busy.key : undefined));
    for (const tile of tiles) if (!active.has(tile.key)) this.queue.push({ ...tile, type: 'tile', generation: this.generation, id: ++this.serial });
    this.pump();
  }
  point(x: number, z: number) {
    this.queue = this.queue.filter(job => job.type !== 'point');
    const job: MapRequest = { type: 'point', x, z, generation: this.generation, id: ++this.serial };
    this.queue.unshift(job); this.pump(); return job.id;
  }
  spawn() {
    const job: MapRequest = { type: 'spawn', generation: this.generation, id: ++this.serial };
    this.queue.unshift(job); this.pump(); return job.id;
  }
  pump() {
    for (const slot of this.slots) if (slot.ready && !slot.busy && this.queue.length) {
      slot.busy = this.queue.shift()!; slot.worker.postMessage(slot.busy);
    }
  }
  dispose() { this.disposed = true; this.queue = []; for (const slot of this.slots) slot.worker.terminate(); }
}
