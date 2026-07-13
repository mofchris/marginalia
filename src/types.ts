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
}
