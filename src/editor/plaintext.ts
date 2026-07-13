import type { EditorSurface } from "../types";

/** Minimal textarea-based editor used for plain-text files and the source view. */
export function createPlainEditor(
  root: HTMLElement,
  initial: string,
  onChange: () => void,
): EditorSurface {
  const ta = document.createElement("textarea");
  ta.className = "text-editor";
  ta.spellcheck = false;
  ta.value = initial;
  ta.addEventListener("input", onChange);
  root.appendChild(ta);

  return {
    getText: () => ta.value,
    setText: (text) => {
      ta.value = text;
    },
    focus: () => ta.focus(),
    destroy: () => ta.remove(),
  };
}
