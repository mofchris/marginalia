export type FileKind = "markdown" | "plain";
export type EditorMode = "wysiwyg" | "source" | "plain";

export interface OpenFile {
  /** Absolute path on disk; null for new/imported (docx, rtf) documents. */
  path: string | null;
  /** Display name shown in the title bar. */
  name: string;
  kind: FileKind;
  /** Content as last saved (or as loaded); used for dirty tracking. */
  savedText: string;
  /** True when the document came from a docx/rtf conversion. */
  imported: boolean;
}

export interface EditorSurface {
  getText(): string;
  setText(text: string): void;
  focus(): void;
  destroy(): void;
  capturePosition?(): EditorPosition;
  restorePosition?(position: EditorPosition): void;
  getSearchText?(): string;
  selectRange?(from: number, to: number): void;
  replaceRanges?(ranges: { from: number; to: number }[], replacement: string): void;
  getHeadings?(): { text: string; level: number; from: number }[];
  /**
   * Highlight search matches (offsets into getSearchText) and scroll the current
   * one into view. Unlike selectRange this works while the editor is unfocused,
   * which it always is while someone is typing in the find bar.
   */
  showMatches?(ranges: { from: number; to: number }[], current: number): void;
  clearMatches?(): void;
}

export interface EditorPosition {
  from: number;
  to: number;
  before: string;
  after: string;
  scrollTop: number;
}
