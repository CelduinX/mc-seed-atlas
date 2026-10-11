// Reserve scrollbar space inside the full-width surfaces, rather than leaving
// an unpainted gutter beside the header and footer. Overlay scrollbars need 0px.
export function createViewportLayout() {
  function measureScrollbar() {
    const probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    Object.assign(probe.style, {
      position: 'fixed', top: '-1000px', width: '100px', height: '100px',
      overflow: 'scroll', visibility: 'hidden', pointerEvents: 'none',
    });
    document.body.append(probe);
    document.documentElement.style.setProperty('--scrollbar-width', `${probe.offsetWidth - probe.clientWidth}px`);
    probe.remove();
  }
  measureScrollbar();
  window.addEventListener('resize', measureScrollbar);
  return {
    dispose() {
      window.removeEventListener('resize', measureScrollbar);
      document.documentElement.style.removeProperty('--scrollbar-width');
    },
  };
}
