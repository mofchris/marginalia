import { readFileSync } from 'node:fs';
import { beforeEach, expect, test, vi } from 'vitest';
import { EditorView } from '@codemirror/view';
import { initWritingTools } from '../src/ui/writing-tools';
import { createPlainEditor } from '../src/editor/plaintext';
import type { EditorSurface } from '../src/types';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

let editor: EditorSurface;
let shown: { count: number; current: number }[];

function type(value: string): void {
  const query = $<HTMLInputElement>('find-query');
  query.value = value;
  query.dispatchEvent(new Event('input', { bubbles: true }));
}

beforeEach(() => {
  vi.spyOn(EditorView.prototype, 'requestMeasure').mockImplementation(() => {});
  document.body.innerHTML = readFileSync('index.html', 'utf8');
  // innerHTML leaves attributes on <body> itself, so reset focus-mode state too.
  delete document.body.dataset.focus;
  delete document.body.dataset.typing;
  shown = [];
  const text = 'alpha beta Alpha gamma alpha';
  editor = {
    getText: () => text, getSearchText: () => text, setText: () => {},
    focus: vi.fn(), destroy: vi.fn(), selectRange: vi.fn(),
    showMatches: vi.fn((ranges: unknown[], current: number) => { shown.push({ count: ranges.length, current }); }),
    clearMatches: vi.fn(),
  };
  initWritingTools(() => editor);
});

// Editors only paint and scroll to their own selection while focused, and the
// find bar always holds focus, so navigation has to highlight independently.
test('typing highlights every match without moving focus or the selection', () => {
  $('btn-find').click();
  type('alpha');
  expect(shown.at(-1)).toEqual({ count: 3, current: 0 });
  expect(editor.selectRange).not.toHaveBeenCalled();
  expect(editor.focus).not.toHaveBeenCalled();
});

test('next and previous move the current match and wrap around', () => {
  $('btn-find').click();
  type('alpha');
  $('find-next').click();
  expect(shown.at(-1)?.current).toBe(1);
  $('find-next').click();
  expect(shown.at(-1)?.current).toBe(2);
  expect($('find-count').textContent).toBe('3 of 3');
  $('find-next').click();
  expect(shown.at(-1)?.current).toBe(0);
  $('find-prev').click();
  expect(shown.at(-1)?.current).toBe(2);
});

test('match case is a toggle button that narrows the matches', () => {
  $('btn-find').click();
  type('alpha');
  const toggle = $('find-case');
  expect(toggle.tagName).toBe('BUTTON');
  expect(toggle.getAttribute('aria-pressed')).toBe('false');
  toggle.click();
  expect(toggle.getAttribute('aria-pressed')).toBe('true');
  expect(shown.at(-1)).toEqual({ count: 2, current: 0 });
});

test('the Find button shows it is active and closes the bar when pressed again', () => {
  const button = $('btn-find');
  button.click();
  expect($('find-bar').hidden).toBe(false);
  expect(button.getAttribute('aria-pressed')).toBe('true');
  button.click();
  expect($('find-bar').hidden).toBe(true);
  expect(button.getAttribute('aria-pressed')).toBe('false');
});

test('closing find clears highlights and lands the caret on the current match', () => {
  $('btn-find').click();
  type('alpha');
  $('find-next').click();
  $('find-close').click();
  expect(editor.clearMatches).toHaveBeenCalled();
  expect(editor.focus).toHaveBeenCalled();
  expect(editor.selectRange).toHaveBeenLastCalledWith(11, 16);
  expect($('btn-find').getAttribute('aria-pressed')).toBe('false');
});

test('the previous and next arrows sit beside the search box and close is last', () => {
  const row = $('find-bar').querySelector('.find-row')!;
  const controls = [...row.children];
  const field = controls.findIndex(child => child.contains($('find-query')));
  expect(controls[field + 1]?.id).toBe('find-prev');
  expect(controls[field + 2]?.id).toBe('find-next');
  expect(controls.at(-1)?.id).toBe('find-close');
});

// Focus mode exists to remove distractions, so its exit control is a quiet icon
// that steps aside while typing and returns when the pointer moves.
test('focus mode shows a quiet exit control that steps aside while typing', () => {
  const exit = $('exit-focus');
  $('btn-focus').click();
  expect(exit.hidden).toBe(false);
  expect(exit.getAttribute('aria-label')).toBe('Exit focus mode');
  expect(exit.classList.contains('ghost-btn')).toBe(false);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
  expect(document.body.dataset.typing).toBe('true');
  document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
  expect(document.body.dataset.typing).toBeUndefined();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', bubbles: true }));
  exit.click();
  expect(exit.hidden).toBe(true);
  expect(document.body.dataset.focus).toBe('false');
  expect(document.body.dataset.typing).toBeUndefined();
});

test('typing outside focus mode does not mark the page as typing', () => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
  expect(document.body.dataset.typing).toBeUndefined();
});

test('source view highlights matches as marks and clears them', () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const source = createPlainEditor(host, 'red green\nred blue', () => {}, true);
  source.showMatches!([{ from: 0, to: 3 }, { from: 10, to: 13 }], 1);
  const marks = [...host.querySelectorAll('.search-match')];
  expect(marks.map(mark => mark.textContent)).toEqual(['red', 'red']);
  expect(marks[1].classList.contains('search-current')).toBe(true);
  source.clearMatches!();
  expect(host.querySelectorAll('.search-match')).toHaveLength(0);
  source.destroy();
});
