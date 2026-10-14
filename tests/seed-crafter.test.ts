import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { query } from '../src/dom.ts';
import { createSeedCrafter } from '../src/seed-crafter.ts';
import { createHome } from '../src/home.ts';

test('homepage templates and the parameter editor remain independent, with navigation, reset and translations', async () => {
  const dom = new JSDOM('<html lang="de"><body><main></main><div id="home-mount"></div></body></html>');
  const globals = { document: dom.window.document, MutationObserver: dom.window.MutationObserver };
  const previous = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const container = query(document, 'main');
  const page = createSeedCrafter(container);
  const homeContainer = query(document, '#home-mount');
  const home = createHome(homeContainer);
  const h = (selector: string) => query(homeContainer, selector);
  const homeSelect = (name: string, value: string) => {
    const element = query(homeContainer, `[name="${name}"]`, 'select');
    element.value = value; element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  };
  const q = (selector: string) => query(container, selector);
  const input = (name: string, value: string) => {
    const element = query(container, `[name="${name}"]`, 'input');
    element.value = value; element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  };
  const select = (name: string, value: string) => {
    const element = query(container, `[name="${name}"]`, 'select');
    element.value = value; element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  };
  try {
    assert.equal(container.querySelectorAll('[data-preset]').length, 0);
    assert.equal(container.querySelectorAll('[role="tab"]').length, 0);
    assert.equal(q('#crafter-manual-panel').hidden, false);
    assert.equal(homeContainer.querySelectorAll('[data-preset]').length, 6);
    assert.equal(homeContainer.querySelector('.home-steps'), null);
    for (const route of ['/biome-finder', '/seed-crafter', '/seed-explorer']) assert(homeContainer.querySelector(`.home-tool[href="${route}"]`));
    assert(h('.home-hero-intro').textContent!.length > 80);
    assert(q('.crafter-search').hasAttribute('disabled'));
    assert(h('.crafter-search').hasAttribute('disabled'));
    input('radius', '3250'); input('water', '70');
    select('craftVersion', '1.18.2'); select('craftWorld', 'large');
    q('[data-craft-action="clear"]').click();
    query(container, '[name="craftBiome"][value="5"]', 'input').click();
    const village = query(container, '[name="craftVillage"]', 'input');
    village.checked = true; village.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    input('villageDistance', '750');
    assert.match(q('.crafter-orbit-radius').textContent!, /3.250/);
    assert.equal(q('[data-fact="version"]').textContent, '1.18.2');

    homeSelect('templateVersion', '1.21.4'); homeSelect('templateWorld', 'standard');
    for (const card of homeContainer.querySelectorAll<HTMLElement>('[data-preset]')) {
      card.click();
      assert.equal(query(container, '[name="radius"]', 'input').value, '3250');
      assert.equal(query(container, '[name="water"]', 'input').value, '70');
      assert.equal(query(container, '[name="craftVersion"]', 'select').value, '1.18.2');
      assert.equal(query(container, '[name="craftWorld"]', 'select').value, 'large');
      assert.equal(query(container, '[name="villageDistance"]', 'input').value, '750');
      assert.deepEqual([...container.querySelectorAll<HTMLInputElement>('[name="craftBiome"]:checked')].map(el => el.value), ['5']);
    }
    h('[data-preset="village"]').click();
    homeSelect('templateRadius', '7500');
    assert.match(h('[data-fact="village"]').textContent!, /500/);
    assert.match(h('.crafter-orbit-radius').textContent!, /7.500/);
    assert.match(q('.crafter-orbit-radius').textContent!, /3.250/);
    assert.match(q('[data-fact="village"]').textContent!, /750/);
    assert.equal(q('#crafter-summary-title').textContent, 'Individuelles Suchprofil');
    document.documentElement.lang = 'en';
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    assert.equal(q('#crafter-summary-title').textContent, 'Custom search profile');
    assert.match(q('.crafter-orbit-radius').textContent!, /3,250/);
    q('[data-craft-action="reset"]').click();
    assert.equal(query(container, '[name="radius"]', 'input').value, '2500');
    assert.equal(query(homeContainer, '[name="templateRadius"]', 'select').value, '7500');
    assert.equal(query(homeContainer, '[name="templateVersion"]', 'select').value, '1.21.4');
    assert.equal(h('[data-preset="village"]').getAttribute('aria-pressed'), 'true');
    assert.equal(village.checked, false);

    assert.equal(h('#crafter-summary-title').textContent, 'A village nearby');
    assert.match(h('.crafter-orbit-radius').textContent!, /7,500/);
    assert.equal(h('[data-fact="version"]').textContent, '1.21.4');
    assert.equal(h('#home-title').textContent, 'Your vision.Your Minecraft seed.');
    assert(homeContainer.querySelector('.home-tool-status.is-preview'));
  } finally {
    home.dispose(); page.dispose(); assert.equal(container.children.length, 0); assert.equal(homeContainer.children.length, 0); dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key);
    }
  }
});
