// Keep routing immediate in older browsers; modern browsers also preserve the
// outgoing page as a snapshot, so workers can be disposed during the update.
export function createPageTransitions(pageDocument: Document = document) {
  const motion = pageDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');
  let transition: ViewTransition | null = null;
  let entrance: Animation | null = null;
  let revision = 0;
  let disposed = false;

  function cancel() {
    revision++;
    transition?.skipTransition();
    transition = null;
    entrance?.cancel();
    entrance = null;
  }

  function update(render: () => void) {
    if (disposed) return;
    cancel();
    const currentRevision = revision;
    const container = pageDocument.querySelector<HTMLElement>('main .page-container');
    if (!container || motion?.matches || pageDocument.visibilityState === 'hidden') {
      render();
      return;
    }

    if (typeof pageDocument.startViewTransition === 'function') {
      const next = pageDocument.startViewTransition(() => {
        // A newer route or HMR update supersedes a pending snapshot callback.
        if (!disposed && currentRevision === revision) render();
      });
      transition = next;
      // Snapshot capture can be skipped (e.g. a background tab or rapid clicks).
      // The DOM update still runs; rejected animation promises are expected.
      void next.ready.catch(() => {});
      void next.finished.catch(() => {}).then(() => {
        if (transition === next) transition = null;
      });
      return;
    }

    render();
    if (typeof container.animate !== 'function') return;
    const animation = container.animate([
      { opacity: 0, transform: 'translateY(10px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    entrance = animation;
    void animation.finished.catch(() => {}).then(() => {
      if (entrance === animation) entrance = null;
    });
  }

  function onMotionChange() {
    if (motion?.matches) {
      // Preserve a pending route update while stopping its visual animation.
      transition?.skipTransition();
      entrance?.cancel();
      entrance = null;
    }
  }
  motion?.addEventListener('change', onMotionChange);

  return {
    update,
    cancel,
    dispose() {
      disposed = true;
      cancel();
      motion?.removeEventListener('change', onMotionChange);
    },
  };
}
