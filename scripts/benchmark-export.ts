import type { ExportDone, WorldConfig } from '../src/types.ts';
import { runExport } from '../src/export-worker.ts';
import { exportRegion } from '../src/explorer-export-core.ts';
import { clampView } from '../src/explorer-core.ts';
import { mkdirSync, writeFileSync } from 'node:fs';

const reports = [];
for (const scale of [64, 16, 4, 1] as const) {
  const start = performance.now(); let bytes = 0, maxRss = 0, last = -1; const completion: { done?: ExportDone } = {};
  const view = clampView({x:0,z:0,bpp:scale === 4 ? 4096/1200 : scale/2},1200,600);
  const config: WorldConfig = { seed: '-123456789', version: '26.3', large: false };
  await runExport({ type: 'export', config, region: exportRegion(view,1200,600,scale), generation: 1, id: 1 }, data => {
    if (data.type === 'file') bytes = data.blob.size; // discard compressed bytes; no file/image created
    if (data.type === 'error') throw new Error(data.message);
    if (data.type === 'done') completion.done = data;
    maxRss = Math.max(maxRss, process.memoryUsage().rss);
    if (data.type === 'progress') {
      const step = Math.floor(data.value * 5);
      if (step !== last) { last = step; console.log(`Scale ${scale}: ${Math.round(data.value * 100)}%`); }
    }
  });
  const done = completion.done;
  if (!done) throw new Error('Incomplete export');
  const report = { scale, width: done.width, height: done.height, timeMs: performance.now() - start, format: done.format, imageBytes: bytes, candidateBytes: done.candidateBytes, rasterBytes: done.rasterBytes, bandBytes: done.bandBytes, wasmBytes: done.wasmBytes, nodeRssMaxBytes: maxRss };
  reports.push(report); console.log(report);
  mkdirSync('.cache', { recursive: true }); writeFileSync('.cache/viewport-export-performance.json', JSON.stringify({ environment: 'Node.js, real WASM, Visible viewport, encoded blobs discarded; includes process RSS but excludes browser/download Blob storage; no images or browser', config, reports }, null, 2));
}
