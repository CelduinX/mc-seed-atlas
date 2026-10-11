import { closest } from './dom.ts';
// Use actual translated text and font metrics to decide when the menu fits.
export function createHeaderNavigation() {
  const layoutElement = document.querySelector<HTMLElement>('.header-layout');
  const brandElement = layoutElement?.querySelector<HTMLElement>('.header-brand');
  const navElement = document.getElementById('header-navigation');
  const toggleElement = document.getElementById('navigation-toggle');
  if (!layoutElement || !brandElement || !navElement || !toggleElement) return null;
  const layout = layoutElement, brand = brandElement, nav = navElement, toggle = toggleElement;
  let frame = 0;
  let disposed = false;
  let menuAnimation: Animation | null = null;

  function setOpen(open: boolean, restoreFocus = false, animate = true) {
    const compact = layout.hasAttribute('data-compact');
    const wasOpen = toggle.getAttribute('aria-expanded') === 'true';
    if (compact && open === wasOpen && animate) return;
    const currentHeight = nav.hidden ? 0 : nav.getBoundingClientRect().height;
    const currentStyle = getComputedStyle(nav);
    const current = {
      height: `${currentHeight}px`, opacity: nav.hidden ? 0 : Number(currentStyle.opacity),
      paddingTop: currentStyle.paddingTop, paddingBottom: currentStyle.paddingBottom,
      borderTopWidth: currentStyle.borderTopWidth,
    };
    menuAnimation?.cancel();
    menuAnimation = null;
    nav.removeAttribute('data-animating');
    toggle.setAttribute('aria-expanded', String(open));
    nav.inert = compact && !open;
    if (restoreFocus) toggle.focus();
    if (!compact || !animate || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      nav.hidden = compact && !open;
      return;
    }
    nav.hidden = false;
    const naturalHeight = nav.getBoundingClientRect().height;
    const style = getComputedStyle(nav);
    const expanded = {
      height: `${naturalHeight}px`, opacity: 1,
      paddingTop: style.paddingTop, paddingBottom: style.paddingBottom,
      borderTopWidth: style.borderTopWidth,
    };
    const collapsed = { height: '0px', opacity: 0, paddingTop: '0px', paddingBottom: '0px', borderTopWidth: '0px' };
    const start = currentHeight === 0 ? collapsed : current;
    nav.setAttribute('data-animating', '');
    const animation = nav.animate([start, open ? expanded : collapsed], {
      duration: open ? 280 : 200,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'both',
    });
    menuAnimation = animation;
    animation.finished.then(() => {
      if (disposed || menuAnimation !== animation) return;
      nav.hidden = !open;
      nav.removeAttribute('data-animating');
      animation.cancel();
      menuAnimation = null;
    }).catch(() => { /* Rapid toggles replace the current animation. */ });
  }

  function intrinsicWidth(element: HTMLElement) {
    const node = element.cloneNode(true);
    if (!(node instanceof element.ownerDocument.defaultView!.HTMLElement)) throw new Error('Invalid navigation clone');
    const clone = node;
    clone.removeAttribute('id');
    clone.removeAttribute('hidden');
    clone.setAttribute('aria-hidden', 'true');
    clone.inert = true;
    Object.assign(clone.style, {
      position: 'fixed', left: '-10000px', top: '0', visibility: 'hidden',
      width: 'max-content', maxWidth: 'none', whiteSpace: 'nowrap',
    });
    document.body.appendChild(clone);
    const width = clone.getBoundingClientRect().width;
    clone.remove();
    return width;
  }

  function measure() {
    frame = 0;
    if (disposed) return;
    const style = getComputedStyle(layout);
    const available = layout.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const compact = intrinsicWidth(brand) + intrinsicWidth(nav) + 24 > available;
    const wasCompact = layout.hasAttribute('data-compact');
    layout.toggleAttribute('data-compact', compact);
    if (compact !== wasCompact) {
      const focus = document.activeElement;
      setOpen(false, compact && nav.contains(focus), false);
      if (!compact && focus === toggle) nav.querySelector('a')?.focus();
    } else if (!compact) setOpen(false, false, false);
  }

  function refresh() {
    if (!disposed && !frame) frame = requestAnimationFrame(measure);
  }
  function onToggle() { setOpen(toggle.getAttribute('aria-expanded') !== 'true'); }
  function onLink(event: MouseEvent) {
    if (layout.hasAttribute('data-compact') && closest(event.target, 'a')) setOpen(false, true);
  }
  function onKey(event: KeyboardEvent) {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, true);
  }
  function onOutsideClick(event: MouseEvent) {
    if (!layout.contains(closest(event.target, '*')) && layout.hasAttribute('data-compact')) setOpen(false);
  }

  const observer = new ResizeObserver(refresh);
  observer.observe(layout);
  toggle.addEventListener('click', onToggle);
  nav.addEventListener('click', onLink);
  document.addEventListener('keydown', onKey);
  document.addEventListener('click', onOutsideClick);
  document.fonts.addEventListener('loadingdone', refresh);
  document.fonts.ready.then(refresh);
  measure();
  return {
    refresh,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      menuAnimation?.cancel();
      nav.removeAttribute('data-animating');
      observer.disconnect();
      toggle.removeEventListener('click', onToggle);
      nav.removeEventListener('click', onLink);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onOutsideClick);
      document.fonts.removeEventListener('loadingdone', refresh);
    },
  };
}
