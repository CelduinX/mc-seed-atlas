import { parentPort } from 'node:worker_threads';
import type { WorkerScope } from '../src/types.ts';

export function installWorkerBridge<Request, Response>(): void {
  if (!parentPort) throw new Error('Worker bridge requires a parent port');
  const port = parentPort;
  const scope: WorkerScope<Request, Response> = {
    onmessage: null,
    postMessage: (message, transfer) => transfer ? port.postMessage(message, transfer) : port.postMessage(message),
  };
  Object.defineProperty(globalThis, 'self', { value: scope, configurable: true });
  port.on('message', (data: Request) => { void scope.onmessage?.({ data }); });
}
