import type { LoadHook } from 'node:module';
export const load: LoadHook = async (url, context, nextLoad) => {
  if (url.endsWith('.css')) return { format: 'module', source: '', shortCircuit: true };
  return nextLoad(url, context);
};
