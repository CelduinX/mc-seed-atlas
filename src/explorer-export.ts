import type { WorldConfig, View, Scale, ExportRequest, ExportResponse, WorkerPort } from './types.ts';
import { createWorker } from './wasm-adapter.ts';
export interface ExportSnapshot { config: WorldConfig; view: View; width: number; height: number; scale: Scale; generation: number }
import { query, closest, type Listen } from './dom.ts';
import { exportRegion, exportFilename } from './explorer-export-core.ts';
import { icon } from './explorer-icons.ts';

export function createExport(root: HTMLElement, t: (key: 'blocks' | 'exportError' | 'exporting') => string, listen: Listen, snapshot: () => ExportSnapshot) {
  const dialog = document.createElement('dialog'); dialog.className = 'explorer-export-dialog';
  dialog.setAttribute('aria-labelledby', 'export-title');
  dialog.innerHTML = `<div class="explorer-dialog-heading"><h2 id="export-title" data-explorer-text="download"></h2><button type="button" class="explorer-icon-button" data-export="close" data-explorer-label="close">${icon('close')}</button></div>
    <p class="explorer-export-area" data-explorer-text="exportView"></p>
    <p class="explorer-export-size"></p><p class="explorer-export-format" data-explorer-text="exportFormat"></p>
    <div class="explorer-export-progress" role="status" aria-live="polite"><span></span><progress max="1" value="0" hidden></progress></div>
    <div class="explorer-dialog-actions"><button type="button" data-export="cancel" data-explorer-text="cancel"></button><button type="button" class="explorer-primary" data-export="start">${icon('download')}<span data-explorer-text="download"></span></button></div>`;
  root.append(dialog);
  const bar = query(dialog, 'progress', 'progress'), status = query(dialog, '[role="status"] span');
  let saved: ExportSnapshot | undefined, worker: WorkerPort<ExportRequest, ExportResponse> | null = null, serial = 0, chunks: Blob[] = [], value: number | null = null, failed = false;
  const urls = new Set<string>(), revokeTimers = new Set<ReturnType<typeof setTimeout>>();
  const region = () => { if (!saved) throw new Error('Missing export snapshot'); return exportRegion(saved.view, saved.width, saved.height, saved.scale); };
  function refresh() {
    if (!saved) return;
    const r = region(); query(dialog, '.explorer-export-size').textContent = `${r.width.toLocaleString()} × ${r.height.toLocaleString()} px · ${r.scale} ${t('blocks')} / px`;
    status.textContent = failed ? t('exportError') : worker ? `${t('exporting')} ${value == null ? '' : `${Math.round(value * 100)}%`}` : '';
    bar.setAttribute('aria-label', t('exporting'));
  }
  function stop() { serial++; worker?.terminate(); worker = null; chunks = []; value = null; failed = false; bar.hidden = true; dialog.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input, [data-export="start"]').forEach(el => { el.disabled = false; }); refresh(); }
  function close() { stop(); if (dialog.open) dialog.close(); }
  listen(dialog, 'change', refresh);
  listen(dialog, 'cancel', event => { event.preventDefault(); close(); });
  listen(dialog, 'click', event => {
    const action = closest(event.target, '[data-export]')?.dataset.export;
    if (action === 'close' || action === 'cancel') { close(); return; }
    if (action !== 'start' || worker || !saved) return;
    failed = false; chunks = []; const id = ++serial, r = region();
    try {
      worker = createWorker<ExportRequest, ExportResponse>(new Worker(new URL('./export-worker.ts', import.meta.url), { type: 'module' }));
      const fail = () => { if (id !== serial) return; stop(); failed = true; refresh(); };
      worker.onerror = fail;
      worker.onmessage = ({ data }) => {
        if (!saved || data.id !== serial || data.generation !== saved.generation || !worker) return;
        try {
          if (data.type === 'file') chunks = [data.blob];
          if (data.type === 'progress') { value = data.value; bar.value = value; refresh(); }
          if (data.type === 'error') fail();
          if (data.type === 'done') {
            const url = URL.createObjectURL(new Blob(chunks, { type: data.mime })); urls.add(url);
            const link = document.createElement('a'); link.href = url; link.download = exportFilename(saved.config, r, data.format); root.append(link); link.click(); link.remove();
            const timer = setTimeout(() => { URL.revokeObjectURL(url); urls.delete(url); revokeTimers.delete(timer); }, 1000);
            revokeTimers.add(timer); close();
          }
        } catch { fail(); }
      };
      dialog.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input, [data-export="start"]').forEach(el => { el.disabled = true; });
      bar.hidden = false; bar.removeAttribute('value'); refresh();
      worker.postMessage({ type: 'export', config: saved.config, region: r, generation: saved.generation, id });
    } catch { stop(); failed = true; refresh(); }
  });
  return {
    open() { saved = snapshot(); stop(); refresh(); dialog.showModal(); }, refresh, close,
    dispose() { close(); for (const timer of revokeTimers) clearTimeout(timer); revokeTimers.clear(); for (const url of urls) URL.revokeObjectURL(url); urls.clear(); dialog.remove(); },
  };
}
