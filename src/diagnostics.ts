/** Opt-in, local performance probe. Excluded from normal builds by Vite. */
export function initDiagnostics(): void {
  const frames: number[] = [], responses: { action: string; ms: number }[] = [], longTasks: number[] = [];
  const views: number[] = [];
  let until = 0, last = 0, running = false;
  let panel: HTMLDialogElement | undefined;
  const bounded = <T>(list: T[], value: T) => { list.push(value); if (list.length > 600) list.shift(); };
  function tick(now: number): void {
    if (document.visibilityState !== 'visible' || now > until || panel?.open) { running = false; last = 0; return; }
    if (last) bounded(frames, now - last);
    last = now; requestAnimationFrame(tick);
  }
  function sample(event: Event): void {
    if (panel?.open || document.visibilityState !== 'visible') return;
    const keyboard = event instanceof KeyboardEvent ? event : undefined;
    if (keyboard?.ctrlKey && keyboard.altKey && keyboard.shiftKey && keyboard.code === 'KeyP') return;
    const target = event.target instanceof Element ? event.target.closest('button, input, [contenteditable]') : null;
    if (!target || target.id === 'perf-probe-button') return;
    const started = performance.now();
    const action = target.id || (keyboard ? 'editor key' : 'editor pointer');
    until = started + 500;
    if (!running) { running = true; last = 0; requestAnimationFrame(tick); }
    requestAnimationFrame(() => requestAnimationFrame(() => bounded(responses, { action, ms: performance.now() - started })));
  }
  document.addEventListener('keydown', sample, true);
  document.addEventListener('pointerdown', sample, true);
  if (typeof PerformanceObserver !== 'undefined') {
    const types = PerformanceObserver.supportedEntryTypes;
    if (types.includes('longtask')) new PerformanceObserver(list => {
      if (!panel?.open && performance.now() <= until) for (const entry of list.getEntries()) bounded(longTasks, entry.duration);
    }).observe({ type: 'longtask' });
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) if (entry.name === 'marginalia:view') bounded(views, entry.duration);
    }).observe({ type: 'measure' });
  }
  const stats = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const at = (fraction: number) => Number((sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] ?? 0).toFixed(2));
    return { count: sorted.length, median: at(.5), p95: at(.95), max: at(1) };
  };
  function showMeasurements(): void {
    if (panel?.open) { panel.close(); return; }
    if (!panel) {
      panel = document.createElement('dialog');
      panel.setAttribute('aria-label', 'Local performance measurements');
      panel.style.cssText = 'max-width:760px;width:80vw;background:var(--bg);color:var(--fg);border:1px solid var(--border);padding:24px';
      const heading = document.createElement('h2'); heading.textContent = 'Local performance measurements';
      const output = document.createElement('pre'); output.id = 'performance-results'; output.style.cssText = 'white-space:pre-wrap;max-height:60vh;overflow:auto;font-size:12px';
      const reset = document.createElement('button'); reset.textContent = 'Reset measurements';
      reset.onclick = () => { frames.length = responses.length = longTasks.length = views.length = 0; panel!.close(); };
      const close = document.createElement('button'); close.textContent = 'Close measurements'; close.onclick = () => panel!.close();
      panel.append(heading, output, reset, close); document.body.appendChild(panel);
    }
    panel.querySelector('pre')!.textContent = JSON.stringify({
      note: 'Milliseconds. Two animation frames after input handler; not OS-to-photon latency. Frames sampled for 500ms after interactions only.',
      runtime: navigator.userAgent, viewport: `${innerWidth}x${innerHeight}`, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      frameIntervals: stats(frames), framesOver34ms: frames.filter(ms => ms > 34).length,
      inputToSecondFrame: stats(responses.map(row => row.ms)), viewActivation: stats(views), longTasks: stats(longTasks), recentInputs: responses.slice(-12),
    }, null, 2);
    panel.showModal();
  }
  const trigger = document.createElement('button');
  trigger.id = 'perf-probe-button'; trigger.className = 'sb-btn'; trigger.textContent = 'Performance';
  trigger.addEventListener('click', showMeasurements);
  document.getElementById('statusbar')!.appendChild(trigger);
  window.addEventListener('keydown', event => {
    if (!(event.ctrlKey && event.altKey && event.shiftKey && event.code === 'KeyP')) return;
    event.preventDefault(); event.stopImmediatePropagation();
    showMeasurements();
  }, true);
}
