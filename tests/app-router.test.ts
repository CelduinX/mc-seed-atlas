import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createAppRouter, normalizeAppPath } from '../src/app-router.ts';
import { explorerLink, explorerRoute } from '../src/start-biome-core.ts';

test('path navigation preserves seed URLs, supports history and leaves external or modified clicks alone', async () => {
  const config = { seed: '-9223372036854775808', version: '1.18.2' as const, large: true };
  const dom = new JSDOM(`<a id="crafter" href="/seed-crafter"><span>Editor</span></a><a id="biomes" href="/biome-finder">Biomes</a><a id="external" href="https://github.com/CelduinX/mc-seed-atlas">GitHub</a><a id="download" href="/seed-crafter" download>Download</a><a id="new-tab" href="/seed-crafter" target="_blank">New tab</a><a id="asset" href="/images/logo-square.webp">Asset</a>`, { url: `https://seed.test/#${explorerLink(config)}` });
  const globals = { window: dom.window, document: dom.window.document };
  const previous = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const { window } = dom;
  let navigations = 0;
  const router = createAppRouter(() => { navigations++; });
  // Prevent jsdom from following ignored links after the router has inspected them.
  document.addEventListener('click', event => event.preventDefault());
  const click = (selector: string, options: MouseEventInit = {}) => document.querySelector(selector)!.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, ...options }));
  const travel = async (direction: 'back' | 'forward') => {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('History event missing')), 2000);
      window.addEventListener('popstate', () => { clearTimeout(timer); resolve(); }, { once: true });
      window.history[direction]();
    });
  };
  try {
    assert.equal(window.location.hash, '');
    assert.equal(window.location.pathname + window.location.search, explorerLink(config));
    assert.deepEqual(explorerRoute(window.location.pathname + window.location.search).config, config);
    assert.equal(normalizeAppPath('/home/'), '/');
    assert.equal(normalizeAppPath('/seed-crafter/'), '/seed-crafter');
    for (const id of ['external','download','new-tab','asset']) click(`#${id}`);
    for (const options of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) click('#crafter', options);
    assert.equal(navigations, 0);
    click('#crafter span');
    assert.equal(window.location.pathname, '/seed-crafter'); assert.equal(window.location.hash, '');
    assert.equal(navigations, 1);
    click('#crafter'); assert.equal(navigations, 1);
    click('#biomes'); assert.equal(window.location.pathname, '/biome-finder');
    await travel('back'); assert.equal(window.location.pathname, '/seed-crafter');
    await travel('back'); assert.equal(window.location.pathname + window.location.search, explorerLink(config));
    await travel('forward'); assert.equal(window.location.pathname, '/seed-crafter');
    const before = navigations;
    router.dispose(); click('#biomes'); assert.equal(navigations, before);
  } finally {
    router.dispose(); dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key);
    }
  }
});
