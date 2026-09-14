import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { EditorView } from '@codemirror/view';
import { createPlainEditor } from '../src/editor/plaintext';
import type { EditorSurface } from '../src/types';

let editor: EditorSurface;
beforeEach(() => {
  vi.spyOn(EditorView.prototype, 'requestMeasure').mockImplementation(() => {});
  document.body.innerHTML = '<div id="editor"></div>';
});
afterEach(() => { editor?.destroy(); });
function open(text: string, markdown = true) {
  editor = createPlainEditor(document.getElementById('editor')!, text, () => {}, markdown);
  return editor;
}

test('source outline finds ATX and setext headings with usable caret offsets', () => {
  const text = '😀 introduction\n\n# First ##\n\nSecond\n======\n\n### Third\n\nSecond\n------';
  open(text);
  const headings = editor.getHeadings?.();
  expect(headings?.map(({ text, level }) => ({ text, level }))).toEqual([
    { text: 'First', level: 1 }, { text: 'Second', level: 1 },
    { text: 'Third', level: 3 }, { text: 'Second', level: 2 },
  ]);
  for (const heading of headings!) {
    editor.selectRange!(heading.from, heading.from);
    expect(editor.capturePosition!().from).toBe(heading.from);
    expect(editor.getText().slice(heading.from)).toMatch(/^(#|Second)/);
  }
});

test('code, HTML blocks and escaped markers do not become outline entries', () => {
  open('```md\n# Example\n```\n\n~~~\n# Also code\n~~~\n\n    # Indented code\n\n<div>\n# HTML content\n</div>\n\n\\# Escaped\n\n# Real');
  expect(editor.getHeadings?.()?.map(heading => heading.text)).toEqual(['Real']);
});

test('outline refreshes after edits and keeps duplicate headings as separate targets', () => {
  open('# One');
  expect(editor.getHeadings?.()?.map(heading => heading.text)).toEqual(['One']);
  editor.setText('# Same\n\n## Same');
  expect(editor.getHeadings?.()).toEqual([
    { text: 'Same', level: 1, from: 0 }, { text: 'Same', level: 2, from: 8 },
  ]);
});

test('plain files are not interpreted as Markdown', () => {
  open('# A line in a text file', false);
  expect(editor.getHeadings?.() ?? []).toEqual([]);
});
