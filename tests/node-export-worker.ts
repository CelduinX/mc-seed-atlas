import { installWorkerBridge } from './worker-bridge.ts';
import type { ExportRequest, ExportResponse } from '../src/types.ts';
installWorkerBridge<ExportRequest, ExportResponse>();
await import('../src/export-worker.ts');
