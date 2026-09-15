import { beforeAll, expect, test } from 'vitest';

beforeAll(() => {
  localStorage.clear();
  document.body.innerHTML =
    '<div id="editor-root"></div><button id="btn-width"></button><button id="btn-zoom-reset"></button>';
});

// The rich editor's virtual cursor only repositions on selectionchange. Zoom and
// width changes move the text without firing one, which stranded the cursor at
// its old size and position until the caret next moved.
test('zoom and width changes ask the editor cursor to reposition', async () => {
  const { initView, stepZoom, cycleWidth } = await import('../src/ui/view');
  initView();
  let notified = 0;
  document.addEventListener('selectionchange', () => { notified++; });

  stepZoom(1);
  expect(document.getElementById('editor-root')!.style.getPropertyValue('--zoom')).toBe('1.1');
  expect(notified).toBe(1);

  cycleWidth();
  expect(notified).toBe(2);
});
