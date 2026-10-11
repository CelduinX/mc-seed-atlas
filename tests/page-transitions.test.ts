import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createPageTransitions } from '../src/page-transitions.ts';

function setup(reduced = false) {
  const dom = new JSDOM('<main><div class="page-container"></div></main>', { pretendToBeVisual: true });
  const motion = Object.assign(new dom.window.EventTarget(), { matches: reduced });
  Object.defineProperty(dom.window, 'matchMedia', { value: () => motion });
  return { dom, motion, document: dom.window.document };
}

test('page transitions: rapid routes and disposal supersede pending snapshot updates', () => {
  const { dom, document } = setup();
  const updates: (() => void)[] = [];
  let skipped = 0;
  Object.defineProperty(document, 'startViewTransition', { value: (update: () => void) => {
    updates.push(update);
    return { ready: Promise.resolve(), finished: Promise.resolve(), skipTransition() { skipped++; } };
  } });
  const transitions = createPageTransitions(document);
  const rendered: string[] = [];
  transitions.update(() => rendered.push('old'));
  transitions.update(() => rendered.push('latest'));
  updates[0]!();
  updates[1]!();
  assert.deepEqual(rendered, ['latest']);
  assert.equal(skipped, 1);
  transitions.update(() => rendered.push('disposed'));
  transitions.dispose();
  updates[2]!();
  transitions.update(() => rendered.push('after disposal'));
  assert.deepEqual(rendered, ['latest']);
  dom.window.close();
});

test('page transitions: reduced motion renders immediately without snapshots', () => {
  const { dom, document } = setup(true);
  Object.defineProperty(document, 'startViewTransition', { value: () => assert.fail('Animation must be skipped') });
  const transitions = createPageTransitions(document);
  let rendered = 0;
  transitions.update(() => rendered++);
  assert.equal(rendered, 1);
  transitions.dispose();
  dom.window.close();
});

test('page transitions: motion preference changes stop animation but preserve pending navigation', () => {
  const { dom, document, motion } = setup();
  let update: (() => void) | undefined;
  let skipped = false;
  Object.defineProperty(document, 'startViewTransition', { value: (callback: () => void) => {
    update = callback;
    return { ready: Promise.reject(new Error('Snapshot skipped')), finished: Promise.resolve(), skipTransition() { skipped = true; } };
  } });
  const transitions = createPageTransitions(document);
  let rendered = false;
  transitions.update(() => { rendered = true; });
  motion.matches = true;
  motion.dispatchEvent(new dom.window.Event('change'));
  update!();
  assert.equal(skipped, true);
  assert.equal(rendered, true);
  transitions.dispose();
  dom.window.close();
});

test('page transitions: fallback renders synchronously and cancels replaced animations', () => {
  const { dom, document } = setup();
  let rendered = 0, animated = 0, canceled = 0;
  Object.defineProperty(document.querySelector('.page-container'), 'animate', { value: () => {
    assert.equal(rendered, animated + 1);
    animated++;
    return { finished: Promise.resolve(), cancel() { canceled++; } };
  } });
  const transitions = createPageTransitions(document);
  transitions.update(() => rendered++);
  transitions.update(() => rendered++);
  assert.equal(rendered, 2);
  assert.equal(canceled, 1);
  transitions.dispose();
  assert.equal(canceled, 2);
  dom.window.close();
});
