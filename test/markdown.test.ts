import { afterEach, expect, test, vi } from 'vitest';
import { createMarkdownEditor } from '../src/editor/markdown';
import { findMatches } from '../src/editor/search';
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

// ProseMirror only paints and scrolls to its selection while focused, and the
// find bar holds focus, so matches are shown as decorations instead.
test('search highlights render without focus, scroll to the current match and leave the document alone', async () => {
  const changed = vi.fn();
  document.body.innerHTML = '<div id="editor-root"></div>';
  editor = await createMarkdownEditor(document.getElementById('editor-root')!, 'one two\n\nthree two', changed);
  const scrolled = vi.fn();
  Element.prototype.scrollIntoView = scrolled;
  editor.showMatches!(findMatches(editor.getSearchText!(), 'two'), 1);
  const marks = [...document.querySelectorAll('.search-match')];
  // The second match ends exactly at the end of its paragraph.
  expect(marks.map(mark => mark.textContent)).toEqual(['two', 'two']);
  expect(marks[1].classList.contains('search-current')).toBe(true);
  expect(scrolled).toHaveBeenCalled();
  editor.clearMatches!();
  expect(document.querySelectorAll('.search-match')).toHaveLength(0);
  expect(changed).not.toHaveBeenCalled();
});

// Copying from the rich view should behave like a word processor: formatting in
// the HTML flavour, readable text without Markdown syntax in the plain flavour.
test('copying from the rich view puts formatted HTML and plain text without Markdown syntax on the clipboard', async () => {
  document.body.innerHTML = '<div id="editor-root"></div>';
  editor = await createMarkdownEditor(document.getElementById('editor-root')!, '### Title\n\nSome **bold** text\n\n- one\n- two', vi.fn());
  editor.selectRange!(0, editor.getSearchText!().length);
  const data = new Map<string, string>();
  const event = new Event('copy', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    value: { setData: (type: string, value: string) => data.set(type, value), clearData: () => data.clear(), getData: (type: string) => data.get(type) ?? '' },
  });
  document.querySelector('.ProseMirror')!.dispatchEvent(event);
  const plain = data.get('text/plain') ?? '';
  expect(plain).toContain('Title');
  expect(plain).toContain('bold');
  expect(plain).not.toMatch(/[#*]|^- /m); // no heading marks, emphasis or list bullets
  expect(data.get('text/html')).toMatch(/<h3[^>]*>Title<\/h3>/);
  expect(data.get('text/html')).toMatch(/<strong[^>]*>bold<\/strong>/);
});

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
