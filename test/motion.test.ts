import { beforeEach, expect, test, vi } from 'vitest';

let reduced = false;
let preferenceChanged: (event: { matches: boolean }) => void;
beforeEach(() => {
  vi.resetModules(); reduced = false;
  vi.stubGlobal('matchMedia', () => ({ matches: reduced, addEventListener: (_: string, handler: typeof preferenceChanged) => { preferenceChanged = handler; } }));
});

test('a new animation cancels the previous one without delaying the action', async () => {
  const { animateSurface } = await import('../src/ui/motion');
  const element = document.createElement('div');
  const previous = { cancel: vi.fn(), finished: new Promise(() => {}) };
  const next = { cancel: vi.fn(), finished: new Promise(() => {}) };
  element.animate = vi.fn().mockReturnValueOnce(previous).mockReturnValueOnce(next);
  animateSurface(element, [{ opacity: .7 }, { opacity: 1 }]);
  animateSurface(element, [{ opacity: .8 }, { opacity: 1 }]);
  expect(previous.cancel).toHaveBeenCalledOnce();
  expect(next.cancel).not.toHaveBeenCalled();
});

test('Reduce Motion suppresses new movement and cancels active movement when changed', async () => {
  const { animateSurface, initMotion } = await import('../src/ui/motion');
  const element = document.createElement('div');
  const animation = { cancel: vi.fn(), finished: new Promise(() => {}) };
  element.animate = vi.fn().mockReturnValue(animation);
  initMotion(); animateSurface(element, [{ opacity: .7 }, { opacity: 1 }]);
  reduced = true; preferenceChanged({ matches: true });
  animateSurface(element, [{ opacity: .7 }, { opacity: 1 }]);
  expect(animation.cancel).toHaveBeenCalledOnce();
  expect(element.animate).toHaveBeenCalledOnce();
});

test('closing an overlay removes interaction immediately and reopening restores it', async () => {
  const { setOverlayVisible } = await import('../src/ui/motion');
  const element = document.createElement('div');
  setOverlayVisible(element, false);
  expect(element.hidden).toBe(true); expect(element.inert).toBe(true);
  expect(element.getAttribute('aria-hidden')).toBe('true');
  setOverlayVisible(element, true);
  expect(element.hidden).toBe(false); expect(element.inert).toBe(false);
  expect(element.getAttribute('aria-hidden')).toBe('false');
});

test('layout actions still finish synchronously without animation support', async () => {
  const { transitionLayout } = await import('../src/ui/motion');
  const action = vi.fn(); transitionLayout(action);
  expect(action).toHaveBeenCalledOnce();
});
