import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import type { EditorSurface } from '../types';
import { captureTextPosition, locatePosition } from './position';
import { sourceHeadings } from './outline';

/** Transaction history includes changes made in the other view and replacements. */
export function createPlainEditor(root: HTMLElement, initial: string, onChange: () => void, markdown = false): EditorSurface {
  const view = new EditorView({
    parent: root,
    state: EditorState.create({ doc: initial, extensions: [
      history(), keymap.of([...defaultKeymap, ...historyKeymap]), EditorView.lineWrapping,
      EditorView.contentAttributes.of({ 'aria-label': 'Document source', spellcheck: 'false' }),
      EditorView.updateListener.of(update => { if (update.docChanged) onChange(); }),
      EditorView.theme({
        '&': { height: '100%', color: 'var(--fg)', backgroundColor: 'var(--bg)' },
        '.cm-scroller': { fontFamily: 'var(--font-mono)', fontSize: '.9rem', lineHeight: '1.6', overflow: 'auto' },
        '.cm-content': { padding: 'var(--space-8) max(var(--space-6), calc((100% - var(--editor-max-width)) / 2))', caretColor: 'var(--accent)' },
        '&.cm-focused': { outline: 'none' },
        '.cm-line': { padding: '0' },
        '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: 'var(--selection)' },
      }),
    ] }),
  });
  let latest = () => view.state.doc.toString();
  let outlinedText: string | undefined;
  let headings: ReturnType<typeof sourceHeadings> = [];
  return {
    getText: () => latest(), getSearchText: () => latest(),
    getHeadings: () => {
      if (!markdown) return [];
      const text = latest();
      if (text !== outlinedText) { headings = sourceHeadings(text); outlinedText = text; }
      return headings;
    },
    setText: text => { view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } }); },
    focus: () => view.focus(),
    destroy: () => { const text = latest(); latest = () => text; view.destroy(); },
    capturePosition: () => captureTextPosition(latest(), view.state.selection.main.from, view.state.selection.main.to, view.scrollDOM.scrollTop),
    restorePosition: position => {
      const range = locatePosition(latest(), position);
      view.dispatch({ selection: { anchor: range.from, head: range.to } });
      view.scrollDOM.scrollTop = position.scrollTop;
    },
    selectRange: (from, to) => {
      view.dispatch({ selection: { anchor: from, head: to }, effects: EditorView.scrollIntoView(from, { y: 'center' }) });
    },
    replaceRanges: (ranges, replacement) => {
      view.dispatch({ changes: ranges.map(({ from, to }) => ({ from, to, insert: replacement })) });
    },
  };
}
