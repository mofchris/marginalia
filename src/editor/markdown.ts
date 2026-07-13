import { Crepe } from "@milkdown/crepe";
import { $prose } from "@milkdown/kit/utils";
import { syntaxRevealPlugin } from "./syntax-reveal";
import type { EditorSurface } from "../types";

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
  });

  crepe.editor.use($prose(() => syntaxRevealPlugin));

  crepe.on((listener) => {
    listener.markdownUpdated((_ctx, markdown, prev) => {
      if (markdown !== prev) onChange();
    });
  });

  await crepe.create();

  let latest = () => crepe.getMarkdown();

  return {
    getText: () => latest(),
    setText: () => {
      // Content replacement is done by recreating the editor (see app.ts);
      // Crepe has no cheap full-document reset.
    },
    focus: () => {
      root.querySelector<HTMLElement>(".ProseMirror")?.focus();
    },
    destroy: () => {
      const text = crepe.getMarkdown();
      latest = () => text; // keep getText usable after teardown
      void crepe.destroy();
    },
  };
}
