import { Crepe } from "@milkdown/crepe";
import { $prose, replaceAll } from "@milkdown/kit/utils";
import { editorViewCtx } from '@milkdown/kit/core';
import { Plugin, TextSelection } from '@milkdown/kit/prose/state';
import { syntaxRevealPlugin } from "./syntax-reveal";
import { codeTheme } from "./code-theme";
import type { EditorSurface } from "../types";
import { captureTextPosition, locatePosition } from './position';

import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

/**
 * WYSIWYG Markdown surface built on Milkdown Crepe (ProseMirror).
 * This module is dynamically imported so the editor's weight doesn't
 * slow down cold start.
 */
export async function createMarkdownEditor(
  root: HTMLElement,
  initial: string,
  onChange: () => void,
): Promise<EditorSurface> {
  const crepe = new Crepe({
    root,
    defaultValue: initial,
    features: {
      [Crepe.Feature.Latex]: false,
    },
    featureConfigs: {
      [Crepe.Feature.CodeMirror]: {
        theme: codeTheme,
      },
    },
  });

  crepe.editor.use($prose(() => syntaxRevealPlugin));

  let ready = false;
  let synchronizing = false;
  // Milkdown's markdownUpdated is debounced: a programmatic update can arrive
  // after mount/save has finished. Observe committed document changes instead.
  crepe.editor.use($prose(() => new Plugin({
    view: () => ({ update: (view, previous) => {
      if (ready && !synchronizing && !view.state.doc.eq(previous.doc)) onChange();
    } }),
  })));

  await crepe.create();

  let sourceText = initial;
  let sourceDoc = crepe.editor.ctx.get(editorViewCtx).state.doc;
  // Reading a file must not rewrite its line endings or Markdown spelling.
  // Returning to the original document through undo also returns its source.
  let latest = () => crepe.editor.ctx.get(editorViewCtx).state.doc.eq(sourceDoc)
    ? sourceText : crepe.getMarkdown();
  ready = true;

  function textIndex() {
    const view = crepe.editor.ctx.get(editorViewCtx);
    let text = '';
    const positions: number[] = [];
    const headings: { text: string; level: number; from: number }[] = [];
    view.state.doc.descendants((node, pos) => {
      if (node.isTextblock && text.length) { positions.push(pos); text += '\n'; }
      if (node.type.name === 'heading') headings.push({ text: node.textContent, level: Number(node.attrs.level), from: text.length });
      if (node.isText) {
        const value = node.text ?? '';
        for (let i = 0; i < value.length; i++) positions.push(pos + i);
        text += value;
      }
    });
    positions.push(Math.max(1, view.state.doc.content.size - 1));
    return { view, text, positions, headings };
  }

  return {
    getText: () => latest(),
    getSearchText: () => textIndex().text,
    getHeadings: () => textIndex().headings,
    selectRange: (from, to) => {
      const { view, positions } = textIndex();
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, positions[from], positions[to])).scrollIntoView());
    },
    replaceRanges: (ranges, replacement) => {
      const { view, positions } = textIndex();
      let transaction = view.state.tr;
      for (const range of [...ranges].reverse()) transaction = transaction.insertText(replacement, positions[range.from], positions[range.to]);
      view.dispatch(transaction);
    },
    // A transaction preserves the existing ProseMirror history and plugins.
    setText: (text) => {
      synchronizing = true;
      try {
        crepe.editor.action(replaceAll(text));
        sourceText = text;
        sourceDoc = crepe.editor.ctx.get(editorViewCtx).state.doc;
      } finally { synchronizing = false; }
    },
    focus: () => {
      root.querySelector<HTMLElement>(".ProseMirror")?.focus();
    },
    destroy: () => {
      ready = false;
      const text = latest();
      latest = () => text; // keep getText usable after teardown
      void crepe.destroy();
    },
    capturePosition: () => {
      const { view, text, positions } = textIndex();
      const index = (pos: number) => {
        const found = positions.findIndex(value => value >= pos);
        return found < 0 ? text.length : found;
      };
      return captureTextPosition(text, index(view.state.selection.from), index(view.state.selection.to),
        document.getElementById('editor-root')?.scrollTop ?? 0);
    },
    restorePosition: (position) => {
      const { view, text, positions } = textIndex();
      const { from, to } = locatePosition(text, position);
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, positions[from], positions[to])));
      const scroll = document.getElementById('editor-root');
      if (scroll) scroll.scrollTop = position.scrollTop;
    },
  };
}
