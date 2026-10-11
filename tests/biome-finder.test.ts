import { query } from '../src/dom.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createBiomeFinder } from '../src/biome-finder.ts';
import { START_BIOME_IDS } from '../src/start-biome-core.ts';

test('biome filters hide cards, preserve selection across languages and recover from empty categories', async () => {
  const dom = new JSDOM('<html lang="de"><body><main></main></body></html>');
  globalThis.document = dom.window.document;
  globalThis.MutationObserver = dom.window.MutationObserver;
  const container = query(document, 'main');
  const page = createBiomeFinder(container);
  const visibleNames = () => [...container.querySelectorAll('.biome-card:not([hidden]) h2 span')].map(el => el.textContent);
  const visibleIds = () => [...container.querySelectorAll<HTMLElement>('.biome-card:not([hidden])')].map(el => Number(el.dataset.biomeId));
  const select = (filter: string) => query(container, `[data-biome-filter="${filter}"]`).click();
  try {
    assert.equal(visibleNames().length, 29);
    assert.deepEqual(visibleIds(), START_BIOME_IDS);
    assert.equal(new Set(visibleIds()).size, 29);
    const filterCounts = [...container.querySelectorAll('.biome-filter-count')].map(el => Number(el.textContent));
    assert.deepEqual(filterCounts, [29, 16, 9, 4, 2, 2]);
    assert.deepEqual([...container.querySelectorAll<HTMLElement>('[data-biome-filter]')].map(el => el.dataset.biomeFilter), ['all', 'forests', 'wasteland', 'desert', 'snow', 'wetlands']);
    assert.equal(query(container, '[data-biome-filter="forests"] .biome-filter-label').textContent, 'Wälder');
    assert.equal(query(container, '[data-biome-id="4"] .biome-card-key').textContent, 'forest');
    assert.equal(query(container, '[data-biome-id="155"] .biome-card-key').textContent, 'old_growth_birch_forest');
    const keys = [...container.querySelectorAll('.biome-card-key')].map(el => el.textContent);
    assert(keys.every(key => key !== null && /^[a-z_]+$/.test(key)));
    for (const excluded of [0, 7, 11, 14, 16, 23, 25, 26, 174, 175, 180, 181, 182, 183, 187]) assert(!visibleIds().includes(excluded));
    const firstCard = query(container, '.biome-card');
    const trigger = query(firstCard, '.biome-card-trigger', 'button');
    assert.equal(query(firstCard, '.biome-card-action span').textContent, 'Seed finden');
    assert.equal(trigger.getAttribute('aria-labelledby'), 'biome-action-0 biome-title-0');
    assert.equal(trigger.getAttribute('aria-describedby'), query(firstCard, 'p').id);
    for (const button of container.querySelectorAll<HTMLElement>('[data-biome-filter]')) {
      query(button, '.biome-filter-count').click();
      assert.equal(Number(query(button, '.biome-filter-count').textContent), visibleNames().length);
      assert.equal(query(button, '.biome-filter-icon').getAttribute('aria-hidden'), 'true');
    }
    select('wasteland');
    assert.deepEqual(visibleIds(), [1, 2, 35, 129, 177, 3, 131, 163, 36]);
    select('forests');
    assert.deepEqual(visibleIds(), [4, 21, 38, 5, 27, 29, 155, 32, 160, 132, 168, 30, 184, 185, 186, 34]);
    select('desert');
    assert.deepEqual(visibleNames(), ['Wüste', 'Tafelberge', 'Bewaldete Tafelberge', 'Abgetragene Tafelberge']);
    select('snow');
    assert.deepEqual(visibleNames(), ['Verschneite Ebene', 'Verschneite Taiga']);
    select('wetlands');
    assert.deepEqual(visibleNames(), ['Sumpf', 'Mangrovensumpf']);
    // An unavailable future category still exercises the empty-state recovery.
    const snowButton = query(container, '[data-biome-filter="snow"]');
    snowButton.dataset.biomeFilter = 'unavailable';
    snowButton.click();
    assert.deepEqual(visibleNames(), []);
    assert.equal(query(container, '.biome-filter-empty').hidden, false);
    document.documentElement.lang = 'en';
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(query(firstCard, '.biome-card-action span').textContent, 'Find seed');
    assert.deepEqual([...container.querySelectorAll('.biome-card-key')].map(el => el.textContent), keys);
    assert.equal(query(container, '[data-biome-filter="forests"] .biome-filter-label').textContent, 'Forests');
    assert.equal(query(container, '[aria-pressed="true"] .biome-filter-label').textContent, 'Snow');
    assert.equal(query(container, '[aria-pressed="true"]').getAttribute('aria-label'), 'Snow: 2 biomes');
    assert.equal(query(container, '[aria-pressed="true"] .biome-filter-count').textContent, '2');
    assert.deepEqual(visibleNames(), []);
    assert.match(query(container, '.biome-filter-empty').textContent!, /No biomes/);
    snowButton.dataset.biomeFilter = 'snow';
    select('snow');
    assert.deepEqual(visibleNames(), ['Snowy Plains', 'Snowy Taiga']);
    assert.equal(query(container, '.biome-card-placeholder span').textContent, 'Screenshot coming soon');
    select('all');
    assert.equal(visibleNames().length, 29);
    assert.equal(query(container, '.biome-filter-empty').hidden, true);
    assert.equal(container.querySelectorAll('[aria-pressed="true"]').length, 1);
  } finally {
    page.dispose();
    assert.equal(container.children.length, 0);
    dom.window.close();
    Reflect.deleteProperty(globalThis, 'document');
    Reflect.deleteProperty(globalThis, 'MutationObserver');
  }
});
