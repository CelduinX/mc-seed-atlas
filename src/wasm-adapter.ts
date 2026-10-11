import type { EngineLoader, EngineMap, WorkerPort, WorkerScope } from './types.ts';

export const loadEngine: EngineLoader = async <Name extends keyof EngineMap>(name: Name) => {
  const url = import.meta.env
    ? new URL(`${import.meta.env.BASE_URL}wasm/${name}.js`, self.location.origin)
    : new URL(`../public/wasm/${name}.js`, import.meta.url);
  const imported: unknown = await import(/* @vite-ignore */ url.href);
  if (!imported || typeof imported !== 'object' || !('default' in imported) || typeof imported.default !== 'function') throw new Error('WASM factory unavailable');
  // Generated Emscripten modules have no declarations. Keep their assertion here.
  const factory = imported.default as (options: { locateFile: (file: string) => string }) => Promise<EngineMap[Name]>;
  return factory({ locateFile: file => new URL(file, url).href });
};

// Keep `new Worker(new URL(...))` at call sites so Vite bundles each entry.
export function createWorker<Request, Response>(worker: Worker): WorkerPort<Request, Response> {
  return worker as unknown as WorkerPort<Request, Response>;
}

export function workerScope<Request, Response>(): WorkerScope<Request, Response> | undefined {
  // Node bridges install a small self object; browsers supply a WorkerGlobalScope.
  return typeof self === 'undefined' ? undefined : self as unknown as WorkerScope<Request, Response>;
}

export function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
