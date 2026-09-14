import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/editor.css";
import "./styles/motion.css";
import { initMotion, setOverlayVisible } from './ui/motion';

import { getCurrentWindow } from "@tauri-apps/api/window";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import {
  guardDirty,
  hasDocument,
  isDirty,
  newFile,
  openPath,
  openViaDialog,
  renameCurrentFile,
  save,
  saveAs,
  toggleSource,
  checkpointSession,
  restoreSession,
  checkExternalChanges,
  currentEditor,
} from "./app";
import { native } from './platform';
import { initWritingTools } from './ui/writing-tools';
import { cliOpenPath, baseName } from "./files/io";
import { getRecentFiles } from "./files/recent";
import { initTheme, toggleTheme } from "./ui/theme";
import { initFileTitle } from "./ui/filetitle";
import { cycleWidth, initView, resetZoom, stepZoom, zoomByWheel } from "./ui/view";

initTheme();
initMotion();
initView();
initFileTitle(renameCurrentFile, hasDocument);
initWritingTools(currentEditor);
if (import.meta.env.VITE_PERF_PROBE === '1') void import('./diagnostics').then(({ initDiagnostics }) => initDiagnostics());

// ---------- Toolbar ----------
document.getElementById("btn-new")!.addEventListener("click", () => void newFile());
document.getElementById("btn-open")!.addEventListener("click", () => void openViaDialog());
document.getElementById("btn-save")!.addEventListener("click", () => void save());
document.getElementById("btn-source")!.addEventListener("click", () => void toggleSource());
document.getElementById("btn-theme")!.addEventListener("click", toggleTheme);

// ---------- View controls ----------
document.getElementById("btn-width")!.addEventListener("click", cycleWidth);
document.getElementById("btn-zoom-in")!.addEventListener("click", () => stepZoom(1));
document.getElementById("btn-zoom-out")!.addEventListener("click", () => stepZoom(-1));
document.getElementById("btn-zoom-reset")!.addEventListener("click", resetZoom);

// Ctrl/Cmd + wheel, which is also what a trackpad pinch reports.
window.addEventListener(
  "wheel",
  (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    zoomByWheel(e.deltaY, e.deltaMode);
  },
  { passive: false },
);

// ---------- Recent files menu ----------
const recentBtn = document.getElementById("btn-recent")!;
const recentMenu = document.getElementById("recent-menu")!;

function renderRecentInto(container: HTMLElement): void {
  container.innerHTML = "";
  const recents = getRecentFiles();
  if (recents.length === 0) {
    const empty = document.createElement("div");
    empty.className = "menu-empty";
    empty.textContent = "No recent files";
    container.appendChild(empty);
    return;
  }
  for (const path of recents) {
    const item = document.createElement("button");
    item.className = "menu-item";
    item.innerHTML = "";
    const name = document.createElement("span");
    name.textContent = baseName(path);
    const sub = document.createElement("span");
    sub.className = "menu-path";
    sub.textContent = path;
    item.append(name, sub);
    item.addEventListener("click", () => {
      setRecentMenuOpen(false);
      void openPath(path);
    });
    container.appendChild(item);
  }
}

recentBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (recentMenu.hidden) renderRecentInto(recentMenu);
  setRecentMenuOpen(recentMenu.hidden);
});
document.addEventListener("click", () => {
  setRecentMenuOpen(false);
});

function setRecentMenuOpen(open: boolean): void {
  setOverlayVisible(recentMenu, open);
  recentBtn.setAttribute('aria-expanded', String(open));
  if (open) recentMenu.querySelector<HTMLElement>('button')?.focus();
}

recentMenu.addEventListener('keydown', event => {
  const items = [...recentMenu.querySelectorAll<HTMLButtonElement>('button')];
  const index = items.indexOf(document.activeElement as HTMLButtonElement);
  if (event.key === 'Escape') { setRecentMenuOpen(false); recentBtn.focus(); }
  else if (event.key === 'ArrowDown') items[(index + 1) % items.length]?.focus();
  else if (event.key === 'ArrowUp') items[(index - 1 + items.length) % items.length]?.focus();
  else return;
  event.preventDefault(); event.stopPropagation();
});

// ---------- Welcome screen ----------
document.getElementById("welcome-open")!.addEventListener("click", () => void openViaDialog());
document.getElementById("welcome-new")!.addEventListener("click", () => void newFile());
renderRecentInto(document.getElementById("welcome-recent")!);

// ---------- Keyboard shortcuts ----------
window.addEventListener("keydown", (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return;
  const key = e.key.toLowerCase();
  if (key === "o" && !e.shiftKey) {
    e.preventDefault();
    void openViaDialog();
  } else if (key === "s" && e.shiftKey) {
    e.preventDefault();
    void saveAs();
  } else if (key === "s") {
    e.preventDefault();
    void save();
  } else if (key === "n") {
    e.preventDefault();
    void newFile();
  } else if (key === "/") {
    e.preventDefault();
    void toggleSource();
  } else if (key === "=" || key === "+") {
    e.preventDefault();
    stepZoom(1);
  } else if (key === "-" || key === "_") {
    e.preventDefault();
    stepZoom(-1);
  } else if (key === "0") {
    e.preventDefault();
    resetZoom();
  }
});

// ---------- Drag & drop to open ----------
if (native) void getCurrentWebview().onDragDropEvent((event) => {
  if (event.payload.type === "drop" && event.payload.paths.length > 0) {
    void openPath(event.payload.paths[0]);
  }
});

// ---------- Unsaved-changes protection on window close ----------
let closing = false;
if (native) void getCurrentWindow().onCloseRequested(async (event) => {
  if (closing || !isDirty()) return;
  event.preventDefault();
  if (await guardDirty()) {
    closing = true;
    void getCurrentWindow().destroy();
  }
});

// ---------- Startup: file association / "Open with" ----------
void (async () => {
  try {
    await restoreSession();
    const path = native ? await cliOpenPath() : null;
    if (path) {
      await openPath(path);
      return;
    }
  } catch {
    // Not fatal — fall through to the welcome screen.
  }
  if (!hasDocument()) {
    document.getElementById("welcome")!.hidden = false;
  }
})();

window.addEventListener('beforeunload', checkpointSession);
document.addEventListener('visibilitychange', () => { if (document.hidden) checkpointSession(); });
window.addEventListener('focus', () => { if (native) void checkExternalChanges(); });
