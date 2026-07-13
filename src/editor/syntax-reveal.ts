import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";
import type { EditorState } from "@milkdown/kit/prose/state";
import type { Mark } from "@milkdown/kit/prose/model";

/**
 * Typora-style contextual syntax reveal: when the caret sits inside a
 * formatted element, show the underlying Markdown markers next to it as
 * dimmed widgets; they vanish as soon as the caret moves away.
 */

const INLINE_MARKERS: Record<string, string> = {
  strong: "**",
  emphasis: "*",
  inlineCode: "`",
  strike_through: "~~",
  strikethrough: "~~",
};

function marker(text: string): HTMLElement {
  const span = document.createElement("span");
  span.className = "syntax-marker";
  span.textContent = text;
  return span;
}

function buildDecorations(state: EditorState): DecorationSet {
  const { selection, doc } = state;
  if (!selection.empty) return DecorationSet.empty;

  const $pos = selection.$head;
  const decos: Decoration[] = [];

  // --- Block-level: heading hashes and blockquote chevrons ---
  for (let d = $pos.depth; d > 0; d--) {
    const node = $pos.node(d);
    if (node.type.name === "heading") {
      const level = (node.attrs.level as number) ?? 1;
      decos.push(
        Decoration.widget($pos.start(d), () => marker("#".repeat(level) + " "), {
          side: -1,
          key: `h${level}`,
        }),
      );
    } else if (node.type.name === "blockquote") {
      decos.push(
        Decoration.widget($pos.start($pos.depth), () => marker("> "), {
          side: -1,
          key: "bq",
        }),
      );
    }
  }

  // --- Inline marks: find the contiguous marked range around the caret ---
  const parent = $pos.parent;
  if (parent.isTextblock) {
    const parentStart = $pos.start();
    const caret = $pos.parentOffset;
    const active = new Set<Mark>();
    // Marks that apply on either side of the caret count as "inside".
    for (const m of [...$pos.marks(), ...(state.storedMarks ?? [])]) active.add(m);
    const after = doc.resolve($pos.pos).nodeAfter;
    if (after?.isText) for (const m of after.marks) active.add(m);

    for (const mark of active) {
      const token = INLINE_MARKERS[mark.type.name];
      const isLink = mark.type.name === "link";
      if (!token && !isLink) continue;

      // Collect contiguous ranges carrying this mark, then pick the caret's.
      const ranges: Array<[number, number]> = [];
      let offset = 0;
      parent.forEach((child) => {
        const end = offset + child.nodeSize;
        if (mark.isInSet(child.marks)) {
          const last = ranges[ranges.length - 1];
          if (last && last[1] === offset) last[1] = end;
          else ranges.push([offset, end]);
        }
        offset = end;
      });
      const range = ranges.find(([f, t]) => caret >= f && caret <= t);
      if (!range) continue;
      const [from, to] = range;

      if (isLink) {
        const href = String((mark.attrs as { href?: string }).href ?? "");
        decos.push(
          Decoration.widget(parentStart + from, () => marker("["), { side: -1, key: "l[" }),
          Decoration.widget(parentStart + to, () => marker(`](${href})`), {
            side: 1,
            key: "l]",
          }),
        );
      } else {
        decos.push(
          Decoration.widget(parentStart + from, () => marker(token), {
            side: -1,
            key: `${mark.type.name}[`,
          }),
          Decoration.widget(parentStart + to, () => marker(token), {
            side: 1,
            key: `${mark.type.name}]`,
          }),
        );
      }
    }
  }

  return decos.length ? DecorationSet.create(doc, decos) : DecorationSet.empty;
}

export const syntaxRevealPlugin = new Plugin({
  key: new PluginKey("marginalia-syntax-reveal"),
  props: {
    decorations: buildDecorations,
  },
});
