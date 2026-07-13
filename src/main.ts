import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/editor.css";

import { getCurrentWindow } from "@tauri-apps/api/window";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import {
  guardDirty,
  hasDocument,
  isDirty,
  newFile,
  openPath,
  openViaDialog,
  save,
  saveAs,
  toggleSource,
} from "./app";
import { cliOpenPath, baseName } from "./files/io";
import { getRecentFiles } from "./files/recent";
import { initTheme, toggleTheme } from "./ui/theme";

initTheme();

// ---------- Toolbar ----------
document.getElementById("btn-new")!.addEventListener("click", () => void newFile());
document.getElementById("btn-open")!.addEventListener("click", () => void openViaDialog());
document.getElementById("btn-save")!.addEventListener("click", () => void save());
document.getElementById("btn-source")!.addEventListener("click", () => void toggleSource());
document.getElementById("btn-theme")!.addEventListener("click", toggleTheme);

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
      recentMenu.hidden = true;
      void openPath(path);
    });
    container.appendChild(item);
  }
}

recentBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (recentMenu.hidden) renderRecentInto(recentMenu);
  recentMenu.hidden = !recentMenu.hidden;
});
document.addEventListener("click", () => {
  recentMenu.hidden = true;
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
  if (key === "o") {
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
  }
});

// ---------- Drag & drop to open ----------
void getCurrentWebview().onDragDropEvent((event) => {
  if (event.payload.type === "drop" && event.payload.paths.length > 0) {
    void openPath(event.payload.paths[0]);
  }
});

// ---------- Unsaved-changes protection on window close ----------
let closing = false;
void getCurrentWindow().onCloseRequested(async (event) => {
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
    const path = await cliOpenPath();
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
