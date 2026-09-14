import { afterEach, expect, test, vi } from 'vitest';
import { createMarkdownEditor } from '../src/editor/markdown';
import type { EditorSurface } from '../src/types';

// JSDOM has no layout engine; only supply the geometry APIs ProseMirror needs.
Object.assign(Range.prototype, {
  getClientRects: () => [],
  getBoundingClientRect: () => new DOMRect(),
});

let editor: EditorSurface | undefined;
afterEach(() => { editor?.destroy(); editor = undefined; document.body.innerHTML = ''; });

test('opening Markdown preserves its exact source without reporting an edit', async () => {
  const changed = vi.fn();
  document.body.innerHTML = '<div id="editor-root"></div>';
  const source = '# A heading\r\n\r\nA paragraph without a final newline';
  editor = await createMarkdownEditor(document.getElementById('editor-root')!, source, changed);
  editor.focus();
  editor.selectRange!(0, 3);
  await new Promise(resolve => setTimeout(resolve, 300));
  expect(changed).not.toHaveBeenCalled();
  expect(editor.getText()).toBe(source);
}, 30_000); // The first real Crepe instance also initializes its lazy plugins.

test('synchronizing a retained rich editor does not report a delayed user edit', async () => {
  const changed = vi.fn();
  document.body.innerHTML = '<div id="editor-root"></div>';
  editor = await createMarkdownEditor(document.getElementById('editor-root')!, 'Original', changed);
  editor.setText('Content synchronized from source');
  await new Promise(resolve => setTimeout(resolve, 300));
  expect(changed).not.toHaveBeenCalled();
  expect(editor.getText()).toBe('Content synchronized from source');
});

test('a real edit is reported immediately and selection changes do not report edits', async () => {
  const changed = vi.fn();
  document.body.innerHTML = '<div id="editor-root"></div>';
  editor = await createMarkdownEditor(document.getElementById('editor-root')!, 'Original', changed);
  editor.replaceRanges!([{ from: 0, to: 8 }], 'Edited');
  expect(changed).toHaveBeenCalledTimes(1);
  expect(editor.getText()).toContain('Edited');
  editor.selectRange!(0, 2);
  expect(changed).toHaveBeenCalledTimes(1);
});
