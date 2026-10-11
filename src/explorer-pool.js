// One outstanding message per worker: initialization cannot race tile jobs.
export class ExplorerPool {
  constructor(count, createWorker, onResult, onError) {
    this.generation = 0; this.serial = 0; this.queue = []; this.onResult = onResult; this.onError = onError; this.disposed = false;
    this.slots = [];
    try { for (let i = 0; i < count; i++) {
      const worker = createWorker(); const slot = { worker, busy: null, ready: false };
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
  configure(config) {
    this.generation++; this.queue = [];
    for (const slot of this.slots) {
      slot.ready = false;
      const job = { type: 'init', config, generation: this.generation, id: ++this.serial };
      slot.busy = job; slot.worker.postMessage(job);
    }
  }
  replaceTiles(tiles) {
    this.queue = this.queue.filter(job => job.type !== 'tile');
    const active = new Set(this.slots.map(slot => slot.busy?.key));
    for (const tile of tiles) if (!active.has(tile.key)) this.queue.push({ ...tile, type: 'tile', generation: this.generation, id: ++this.serial });
    this.pump();
  }
  point(x, z) {
    this.queue = this.queue.filter(job => job.type !== 'point');
    const job = { type: 'point', x, z, generation: this.generation, id: ++this.serial };
    this.queue.unshift(job); this.pump(); return job.id;
  }
  spawn() {
    const job = { type: 'spawn', generation: this.generation, id: ++this.serial };
    this.queue.unshift(job); this.pump(); return job.id;
  }
  pump() {
    for (const slot of this.slots) if (slot.ready && !slot.busy && this.queue.length) {
      slot.busy = this.queue.shift(); slot.worker.postMessage(slot.busy);
    }
  }
  dispose() { this.disposed = true; this.queue = []; for (const slot of this.slots) slot.worker.terminate(); }
}
