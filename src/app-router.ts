import { closest } from './dom.ts';

export const APP_PATHS = ['/', '/biome-finder', '/seed-crafter', '/seed-explorer'] as const;
export function normalizeAppPath(path: string) {
  const normalized = path.replace(/\/+$/, '') || '/';
  return normalized === '/home' ? '/' : normalized;
}

export function createAppRouter(onNavigate: () => void) {
  const { location, history } = window;
  // Previously shared hash URLs remain usable, but become clean URLs immediately.
  if (location.hash.startsWith('#/')) history.replaceState(null, '', location.hash.slice(1));
  const initialPath = normalizeAppPath(location.pathname);
  if (initialPath !== location.pathname) history.replaceState(null, '', `${initialPath}${location.search}${location.hash}`);
  function onClick(event: MouseEvent) {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = closest(event.target, 'a');
    if (!link || link.hasAttribute('download') || (link.getAttribute('target') && link.getAttribute('target') !== '_self')) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    const url = new URL(href, location.href);
    const path = normalizeAppPath(url.pathname);
    if (url.origin !== location.origin || !APP_PATHS.some(route => route === path)) return;
    event.preventDefault();
    const destination = `${path}${url.search}${url.hash}`;
    if (destination === `${location.pathname}${location.search}${location.hash}`) return;
    history.pushState(null, '', destination);
    onNavigate();
  }
  document.addEventListener('click', onClick);
  window.addEventListener('popstate', onNavigate);
  return { dispose() { document.removeEventListener('click', onClick); window.removeEventListener('popstate', onNavigate); } };
}
