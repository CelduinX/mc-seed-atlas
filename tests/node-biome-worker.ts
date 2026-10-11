import { installWorkerBridge } from './worker-bridge.ts';
import type { MapRequest, MapResponse } from '../src/types.ts';
installWorkerBridge<MapRequest, MapResponse>();
await import('../src/biome-worker.ts');
