const active = new Map<HTMLElement, Animation>();
const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';

export const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Animations decorate a completed action; they never delay focus or input. */
export function animateSurface(element: HTMLElement, frames: Keyframe[], duration = 180): void {
  active.get(element)?.cancel();
  active.delete(element);
  if (reduceMotion() || typeof element.animate !== 'function') return;
  const animation = element.animate(frames, { duration, easing: ease });
  active.set(element, animation);
  void animation.finished.catch(() => {}).finally(() => {
    if (active.get(element) === animation) active.delete(element);
  });
}

export function initMotion(): void {
  if (typeof matchMedia !== 'function') return;
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => {
    if (event.matches) { for (const animation of active.values()) animation.cancel(); active.clear(); }
  });
}

/** Keep text at its old visual position, then settle into the new layout. No scale. */
export function transitionLayout(change: () => void): void {
  const surface = document.querySelector<HTMLElement>('.editor-surface:not([hidden])');
  const anchor = surface?.querySelector<HTMLElement>('.ProseMirror > :first-child, .cm-line');
  if (!surface || !anchor || reduceMotion()) { change(); return; }
  const before = anchor.getBoundingClientRect();
  active.get(surface)?.cancel(); active.delete(surface);
  change();
  const after = anchor.getBoundingClientRect();
  const zoom = Number.parseFloat(getComputedStyle(document.getElementById('editor-root')!).zoom) || 1;
  const x = (before.left - after.left) / zoom, y = (before.top - after.top) / zoom;
  if (Math.abs(x) + Math.abs(y) < 1) return;
  animateSurface(surface, [{ transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0, 0)' }], 220);
}

/** Display transitions may still paint an exit, but closed overlays stop taking input. */
export function setOverlayVisible(element: HTMLElement, visible: boolean): void {
  element.inert = !visible;
  element.setAttribute('aria-hidden', String(!visible));
  element.hidden = !visible;
}
