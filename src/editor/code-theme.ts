import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";

/**
 * Code-block theme for Crepe's CodeMirror feature. Without an explicit theme,
 * CodeMirror falls back to its built-in light chrome, which ignores our design
 * tokens entirely. Every colour here is a CSS variable so code blocks follow
 * the light/dark toggle without a re-mount.
 */
const chrome = EditorView.theme({
  "&": {
    backgroundColor: "var(--bg-inset)",
    color: "var(--fg)",
    fontSize: "0.875rem",
  },
  ".cm-content": {
    caretColor: "var(--accent)",
    fontFamily: "var(--font-mono)",
    padding: "var(--space-3) 0",
  },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--accent)" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground":
    { backgroundColor: "var(--selection)" },
  ".cm-activeLine": { backgroundColor: "transparent" },
  ".cm-gutters": {
    backgroundColor: "var(--bg-inset)",
    color: "var(--fg-faint)",
    borderRight: "1px solid var(--border)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
    color: "var(--fg-muted)",
  },
});

/* Restrained syntax palette: neutrals carry the structure, the accent is
   reserved for keywords, exactly like the rest of the app reserves it for
   primary actions. */
const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.moduleKeyword, tags.operatorKeyword], color: "var(--accent)" },
  { tag: [tags.string, tags.special(tags.string), tags.regexp], color: "var(--fg-muted)" },
  { tag: [tags.comment, tags.blockComment, tags.lineComment], color: "var(--fg-faint)", fontStyle: "italic" },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: "var(--accent-strong)" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: "var(--fg)", fontWeight: "600" },
  { tag: [tags.typeName, tags.className, tags.namespace], color: "var(--fg)", fontWeight: "600" },
  { tag: [tags.definition(tags.variableName), tags.propertyName, tags.attributeName], color: "var(--fg)" },
  { tag: [tags.operator, tags.punctuation, tags.bracket], color: "var(--fg-muted)" },
  { tag: [tags.meta, tags.processingInstruction], color: "var(--fg-faint)" },
  { tag: tags.invalid, color: "var(--accent-strong)", textDecoration: "underline wavy" },
]);

export const codeTheme: Extension = [chrome, syntaxHighlighting(highlight)];
