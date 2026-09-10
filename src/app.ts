import { getCurrentWindow } from "@tauri-apps/api/window";
import type { EditorMode, EditorSurface, OpenFile } from "./types";
import { createPlainEditor } from "./editor/plaintext";
import {
  MARKDOWN_EXTS,
  baseName,
  dirOf,
  extOf,
  pickFileToOpen,
  pickSavePath,
  readTextFile,
  renameFile,
  writeTextFile,
} from "./files/io";
import { addRecentFile, removeRecentFile } from "./files/recent";
import { setStatusType, updateWordCount } from "./ui/statusbar";
import { confirmDiscard } from "./ui/modal";
import { hideNotice, showNotice } from "./ui/notice";

/** Markdown documents larger than this open in source view first (perf guard). */
const LARGE_MD_THRESHOLD = 500_000;

const editorRoot = document.getElementById("editor-root")!;
const welcomeEl = document.getElementById("welcome")!;
const fileNameEl = document.getElementById("file-name")!;
const dirtyDotEl = document.getElementById("dirty-dot")!;
const sourceBtn = document.getElementById("btn-source")!;

let file: OpenFile | null = null;
let editor: EditorSurface | null = null;
let mode: EditorMode = "wysiwyg";
let dirty = false;
let mountSeq = 0;
let mounting = false; // ignore editor change events fired during initial mount
let statsTimer: ReturnType<typeof setTimeout> | undefined;

export const isDirty = () => dirty;
export const currentFileName = () => file?.name ?? "Untitled";
export const hasDocument = () => file !== null;

function markDirty(): void {
  if (mounting) return;
  if (!dirty) {
    dirty = true;
    refreshTitle();
  }
  clearTimeout(statsTimer);
  statsTimer = setTimeout(() => updateWordCount(editor?.getText() ?? ""), 350);
}

function refreshTitle(): void {
  const name = currentFileName();
  fileNameEl.textContent = name;
  dirtyDotEl.hidden = !dirty;
  void getCurrentWindow().setTitle(`${dirty ? "• " : ""}${name} — Marginalia`);
}

function refreshStatus(): void {
  if (!file) {
    setStatusType("");
    return;
  }
  const origin = file.imported ? " (imported)" : "";
  const label =
    file.kind === "markdown"
      ? mode === "source"
        ? "Markdown · source"
        : "Markdown · WYSIWYG"
      : "Plain text";
  setStatusType(label + origin);
  sourceBtn.classList.toggle("active", mode === "source");
  sourceBtn.setAttribute("aria-pressed", String(mode === "source"));
  (sourceBtn as HTMLButtonElement).disabled = file.kind !== "markdown";
}

async function mountEditor(nextMode: EditorMode, text: string): Promise<void> {
  const seq = ++mountSeq;
  mounting = true;
  editor?.destroy();
  editor = null;
  editorRoot.innerHTML = "";
  welcomeEl.hidden = true;
  mode = nextMode;

  if (nextMode === "wysiwyg") {
    const { createMarkdownEditor } = await import("./editor/markdown");
    if (seq !== mountSeq) return; // a newer mount superseded this one
    editor = await createMarkdownEditor(editorRoot, text, markDirty);
    if (seq !== mountSeq) {
      editor.destroy();
      return;
    }
  } else {
    editor = createPlainEditor(editorRoot, text, markDirty);
  }
  editor.focus();
  refreshStatus();
  updateWordCount(text);
  // Let any normalization transactions from editor creation settle first.
  setTimeout(() => {
    if (seq === mountSeq) mounting = false;
  }, 100);
}

/** Returns true when it is safe to replace the current document. */
export async function guardDirty(): Promise<boolean> {
  if (!dirty) return true;
  const choice = await confirmDiscard(currentFileName());
  if (choice === "cancel") return false;
  if (choice === "save") return save();
  return true;
}

export async function newFile(): Promise<void> {
  if (!(await guardDirty())) return;
  hideNotice();
  file = { path: null, name: "Untitled.md", kind: "markdown", savedText: "", imported: false };
  dirty = false;
  refreshTitle();
  await mountEditor("wysiwyg", "");
}

export async function openViaDialog(): Promise<void> {
  const path = await pickFileToOpen();
  if (path) await openPath(path);
}

export async function openPath(path: string): Promise<void> {
  if (!(await guardDirty())) return;
  hideNotice();
  const ext = extOf(path);
  const name = baseName(path);

  try {
    if (ext === "docx") {
      const { importDocx } = await import("./files/import");
      const md = await importDocx(path);
      file = {
        path: null,
        name: name.replace(/\.docx$/i, ".md"),
        kind: "markdown",
        savedText: md,
        imported: true,
      };
      dirty = false;
      refreshTitle();
      await mountEditor("wysiwyg", md);
      showNotice("Imported from DOCX — saving will create a new Markdown file.");
    } else if (ext === "rtf") {
      const { importRtf } = await import("./files/import");
      const text = await importRtf(path);
      file = {
        path: null,
        name: name.replace(/\.rtf$/i, ".txt"),
        kind: "plain",
        savedText: text,
        imported: true,
      };
      dirty = false;
      refreshTitle();
      await mountEditor("plain", text);
      showNotice("Imported from RTF (formatting dropped) — saving will create a new text file.");
    } else if (MARKDOWN_EXTS.includes(ext)) {
      const text = await readTextFile(path);
      file = { path, name, kind: "markdown", savedText: text, imported: false };
      dirty = false;
      addRecentFile(path);
      refreshTitle();
      if (text.length > LARGE_MD_THRESHOLD) {
        await mountEditor("source", text);
        showNotice("Large file — opened in source view to stay fast.", {
          label: "Render anyway",
          run: () => void switchToWysiwyg(),
        });
      } else {
        await mountEditor("wysiwyg", text);
      }
    } else {
      const text = await readTextFile(path);
      file = { path, name, kind: "plain", savedText: text, imported: false };
      dirty = false;
      addRecentFile(path);
      refreshTitle();
      await mountEditor("plain", text);
    }
  } catch (err) {
    removeRecentFile(path);
    showNotice(`Could not open ${name}: ${String(err)}`);
  }
}

export async function save(): Promise<boolean> {
  if (!file || !editor) return false;
  if (!file.path) return saveAs();
  try {
    const text = editor.getText();
    await writeTextFile(file.path, text);
    file.savedText = text;
    dirty = false;
    refreshTitle();
    return true;
  } catch (err) {
    showNotice(`Save failed: ${String(err)}`);
    return false;
  }
}

export async function saveAs(): Promise<boolean> {
  if (!file || !editor) return false;
  const path = await pickSavePath(file.name, file.kind === "markdown");
  if (!path) return false;
  try {
    const text = editor.getText();
    await writeTextFile(path, text);
    file.path = path;
    file.name = baseName(path);
    file.imported = false;
    file.savedText = text;
    dirty = false;
    addRecentFile(path);
    refreshTitle();
    refreshStatus();
    return true;
  } catch (err) {
    showNotice(`Save failed: ${String(err)}`);
    return false;
  }
}

/** Markdown or plain text, decided by extension. */
function kindForName(name: string): OpenFile["kind"] {
  return MARKDOWN_EXTS.includes(extOf(name)) ? "markdown" : "plain";
}

/**
 * Rename the open document from the title bar. Untitled and freshly imported
 * documents have nothing on disk yet, so they only take the new name locally
 * and carry it into the next Save As.
 */
export async function renameCurrentFile(nextName: string): Promise<boolean> {
  if (!file) return false;
  const name = nextName.trim();
  if (!name || name === file.name) return false;
  if (/[\\/]/.test(name)) {
    showNotice("A file name cannot contain \\ or /.");
    return false;
  }

  const prevKind = file.kind;

  if (file.path) {
    const target = dirOf(file.path) + name;
    try {
      await renameFile(file.path, target);
    } catch (err) {
      showNotice(`Rename failed: ${String(err)}`);
      return false;
    }
    removeRecentFile(file.path);
    addRecentFile(target);
    file.path = target;
  }

  file.name = name;
  file.kind = kindForName(name);
  refreshTitle();
  refreshStatus();

  // A changed extension changes which editor is the right one for the file.
  if (file.kind !== prevKind && editor) {
    await mountEditor(file.kind === "markdown" ? "wysiwyg" : "plain", editor.getText());
  }
  return true;
}

async function switchToWysiwyg(): Promise<void> {
  if (!editor) return;
  await mountEditor("wysiwyg", editor.getText());
}

/** Ctrl+/ — flip a markdown document between WYSIWYG and raw source. */
export async function toggleSource(): Promise<void> {
  if (!file || !editor || file.kind !== "markdown") return;
  const text = editor.getText();
  await mountEditor(mode === "wysiwyg" ? "source" : "wysiwyg", text);
}
