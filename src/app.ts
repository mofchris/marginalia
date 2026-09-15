import { setWindowTitle } from './platform';
import { animateSurface } from './ui/motion';
import type { EditorMode, EditorSurface, OpenFile } from "./types";
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
import { readSession, writeSession, recoveryDecision, discardSession } from './files/recovery';

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
let saving: Promise<boolean> | null = null;
let recoveryTimer: ReturnType<typeof setTimeout> | undefined;
let recoveryAvailable = true;
let discarding = false;
const surfaces = new Map<EditorMode, { editor: EditorSurface; host: HTMLElement }>();

export const isDirty = () => dirty;
export const currentFileName = () => file?.name ?? "Untitled";
export const hasDocument = () => file !== null;
export const currentEditor = () => editor;

function markDirty(): void {
  if (mounting) return;
  const changed = !!file && !!editor && editor.getText() !== file.savedText;
  if (dirty !== changed) {
    dirty = changed;
    refreshTitle();
  }
  clearTimeout(statsTimer);
  statsTimer = setTimeout(() => updateWordCount(editor?.getText() ?? ""), 350);
  clearTimeout(recoveryTimer);
  recoveryTimer = setTimeout(checkpointSession, 500);
  document.dispatchEvent(new Event('document-change'));
}

export function checkpointSession(): void {
  clearTimeout(recoveryTimer);
  if (!file || !editor || mounting || discarding) return;
  recoveryAvailable = writeSession({ version: 1, file: { ...file }, text: editor.getText(),
    mode, dirty, position: editor.capturePosition?.() });
  refreshSaveStatus();
}

function refreshSaveStatus(): void {
  const status = document.getElementById('save-status');
  if (!status) return;
  status.textContent = !file ? '' : !recoveryAvailable ? 'Recovery unavailable — save your work'
    : saving ? 'Saving…' : dirty ? 'Unsaved changes' : file.path ? 'Saved' : 'Draft';
  status.title = dirty && recoveryAvailable ? 'A recovery draft is kept on this device. Save to update your file.' : '';
}

function refreshTitle(): void {
  const name = currentFileName();
  fileNameEl.textContent = name;
  dirtyDotEl.hidden = !dirty;
  setWindowTitle(`${dirty ? "• " : ""}${name} — Marginalia`);
  refreshSaveStatus();
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
  sourceBtn.setAttribute('aria-pressed', String(mode === 'source'));
  (sourceBtn as HTMLButtonElement).disabled = file.kind !== "markdown";
}

async function mountEditor(nextMode: EditorMode, text: string, preserve = false): Promise<void> {
  const started = performance.now();
  const seq = ++mountSeq;
  mounting = true;
  const position = preserve ? editor?.capturePosition?.() : undefined;
  const scrollTop = editorRoot.scrollTop;
  let activated = false;
  editorRoot.setAttribute('aria-busy', 'true');
  editorRoot.inert = true;
  try {
    let next = preserve ? surfaces.get(nextMode) : undefined;
    if (!next) {
      const host = document.createElement('div');
      host.className = 'editor-surface';
      host.hidden = true;
      editorRoot.appendChild(host);
      let surface: EditorSurface;
      try {
        surface = nextMode === 'wysiwyg'
          ? await (await import('./editor/markdown')).createMarkdownEditor(host, text, markDirty)
          : (await import('./editor/plaintext')).createPlainEditor(host, text, markDirty, nextMode === 'source');
      } catch (error) { host.remove(); throw error; }
      if (seq !== mountSeq) { surface.destroy(); host.remove(); return; }
      next = { editor: surface, host };
    } else if (next.editor.getText() !== text) {
      next.editor.setText(text);
    }
    if (!preserve) {
      for (const previous of surfaces.values()) { previous.editor.destroy(); previous.host.remove(); }
      surfaces.clear();
    }
    for (const previous of surfaces.values()) previous.host.hidden = true;
    surfaces.set(nextMode, next);
    next.host.hidden = false;
    editor = next.editor;
    discarding = false;
    mode = nextMode;
    welcomeEl.hidden = true;
    editorRoot.inert = false;
    editor.focus();
    if (position) editor.restorePosition?.(position);
    if (preserve) animateSurface(next.host, [{ opacity: .72 }, { opacity: 1 }], 120);
    editorRoot.scrollTop = preserve ? scrollTop : 0;
    refreshStatus();
    updateWordCount(text);
    activated = true;
    document.dispatchEvent(new Event('document-change'));
  } finally {
    if (seq === mountSeq) {
      mounting = false;
      editorRoot.setAttribute('aria-busy', 'false');
      editorRoot.inert = false;
      if (activated) checkpointSession();
      // Development-only measurement: activation work, not end-to-end input/paint latency.
      if (import.meta.env.DEV && preserve) editorRoot.dataset.switchMs = (performance.now() - started).toFixed(2);
      if (import.meta.env.VITE_PERF_PROBE === '1' && preserve) performance.measure('marginalia:view', { start: started, end: performance.now() });
    }
  }
}

/** Returns true when it is safe to replace the current document. */
export async function guardDirty(): Promise<boolean> {
  if (!dirty) return true;
  const choice = await confirmDiscard(currentFileName());
  if (choice === "cancel") return false;
  if (choice === "save") return save();
  discarding = true;
  discardSession();
  return true;
}

export async function newFile(): Promise<void> {
  if (!(await guardDirty())) return;
  const previousFile = file, previousDirty = dirty, previousMode = mode;
  hideNotice();
  file = { path: null, name: "Untitled.md", kind: "markdown", savedText: "", imported: false };
  dirty = false;
  refreshTitle();
  try { await mountEditor("wysiwyg", ""); }
  catch {
    file = previousFile; dirty = previousDirty; mode = previousMode; discarding = false;
    refreshTitle(); refreshStatus(); checkpointSession();
    showNotice('Couldn’t create the editor. Your previous document is still open.');
  }
}

export async function openViaDialog(): Promise<void> {
  const path = await pickFileToOpen();
  if (path) await openPath(path);
}

export async function openPath(path: string): Promise<void> {
  if (!(await guardDirty())) return;
  const previousFile = file, previousDirty = dirty, previousMode = mode;
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
    file = previousFile; dirty = previousDirty; mode = previousMode; discarding = false;
    refreshTitle(); refreshStatus(); checkpointSession();
    removeRecentFile(path);
    showNotice(`Could not open ${name}: ${String(err)}`);
  }
}

export async function save(): Promise<boolean> {
  return beginSave(false);
}

export async function saveAs(): Promise<boolean> {
  return beginSave(true);
}

function beginSave(asCopy: boolean): Promise<boolean> {
  if (saving) return saving;
  saving = persistDocument(asCopy).finally(() => { saving = null; checkpointSession(); });
  refreshSaveStatus();
  return saving;
}

async function persistDocument(asCopy: boolean): Promise<boolean> {
  if (!file || !editor) return false;
  const documentToSave = file;
  const surface = editor;
  try {
    const path = asCopy || !documentToSave.path
      ? await pickSavePath(documentToSave.name, documentToSave.kind === "markdown")
      : documentToSave.path;
    if (!path || file !== documentToSave) return false;
    const text = surface.getText();
    if (path === documentToSave.path) {
      const disk = await readTextFile(path);
      if (disk !== documentToSave.savedText) {
        showNotice('This file changed in another app. Save a copy to keep both versions.',
          { label: 'Save a copy', run: () => { void saveAs(); } });
        return false;
      }
    }
    if (file !== documentToSave) return false;
    await writeTextFile(path, text);
    documentToSave.path = path;
    documentToSave.name = baseName(path);
    documentToSave.imported = false;
    documentToSave.savedText = text;
    addRecentFile(path);
    // An asynchronous save must never mark a newer revision or another file saved.
    if (file !== documentToSave) return false;
    dirty = editor?.getText() !== text;
    refreshTitle();
    refreshStatus();
    return !dirty;
  } catch (err) {
    showNotice(`Couldn’t save this document. ${String(err)}`, {
      label: "Save a copy", run: () => { void saveAs(); },
    });
    return false;
  }
}

/** Markdown or plain text, decided by extension. */
function kindForName(name: string): OpenFile["kind"] {
  return MARKDOWN_EXTS.includes(extOf(name)) ? "markdown" : "plain";
}

/**
 * Rename the open document from the title bar. Untitled and freshly imported
 * documents have nothing on disk yet, so they take the new name locally, and
 * when the name is confirmed with Enter they are saved under it straight away.
 */
export async function renameCurrentFile(nextName: string, confirmed = false): Promise<boolean> {
  if (!file) return false;
  let name = nextName.trim();
  if (!name) return false;
  if (/[\\/]/.test(name)) {
    showNotice("A file name cannot contain \\ or /.");
    return false;
  }

  const unsaved = !file.path;
  // "notes" means notes.md for a Markdown document. Without this the missing
  // extension would count as a change of kind and turn it into plain text.
  if (unsaved && !extOf(name)) name += file.kind === "markdown" ? ".md" : ".txt";
  if (name === file.name) return unsaved && confirmed ? save() : false;

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
  return unsaved && confirmed ? save() : true;
}

export async function restoreSession(): Promise<boolean> {
  const session = readSession();
  if (!session) return false;
  let disk: string | null = null;
  if (session.file.path) {
    try { disk = await readTextFile(session.file.path); } catch { /* recover a copy below */ }
  }
  const decision = recoveryDecision(session, disk);
  file = { ...session.file };
  dirty = session.dirty;
  let text = session.text;
  if (decision === 'disk') { text = disk!; file.savedText = text; dirty = false; }
  if (decision === 'copy') {
    file.path = null;
    dirty = true;
    showNotice('Your file changed or is unavailable. Recovered your work as a separate draft.',
      { label: 'Save a copy', run: () => { void saveAs(); } });
  }
  const restoredMode = file.kind === 'plain' ? 'plain'
    : text.length > LARGE_MD_THRESHOLD ? 'source' : session.mode === 'plain' ? 'wysiwyg' : session.mode;
  refreshTitle();
  await mountEditor(restoredMode, text);
  if (session.position) editor?.restorePosition?.(session.position);
  if (session.dirty && decision === 'draft') showNotice('Recovered your unsaved draft.');
  return true;
}

export async function checkExternalChanges(): Promise<void> {
  if (!file?.path || !editor || saving || mounting) return;
  const current = file;
  try {
    const disk = await readTextFile(current.path!);
    if (file !== current || saving || disk === current.savedText) return;
    if (dirty) {
      showNotice('This file changed in another app. Your draft is kept here.',
        { label: 'Save a copy', run: () => { void saveAs(); } });
      return;
    }
    const position = editor.capturePosition?.();
    current.savedText = disk;
    await mountEditor(mode, disk);
    if (position) editor?.restorePosition?.(position);
    showNotice('Updated from disk.');
  } catch {
    showNotice('This file is unavailable. Your work is still open.',
      { label: 'Save a copy', run: () => { void saveAs(); } });
  }
}

async function switchToWysiwyg(): Promise<void> {
  if (!editor) return;
  await mountEditor("wysiwyg", editor.getText());
}

/** Ctrl+/ — flip a markdown document between WYSIWYG and raw source. */
export async function toggleSource(): Promise<void> {
  if (!file || !editor || mounting || file.kind !== "markdown") return;
  const text = editor.getText();
  await mountEditor(mode === "wysiwyg" ? "source" : "wysiwyg", text, true);
}

