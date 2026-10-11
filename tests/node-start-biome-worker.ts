import { installWorkerBridge } from './worker-bridge.ts';
import type { SearchRequest, SearchResponse } from '../src/types.ts';
installWorkerBridge<SearchRequest, SearchResponse>();
await import('../src/start-biome-worker.ts');
