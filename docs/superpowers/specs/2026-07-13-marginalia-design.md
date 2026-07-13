# Marginalia — design spec (2026-07-13)

## Purpose
A lightweight, cross-platform, WYSIWYG Markdown-first desktop editor. Markdown renders live in place (Typora-style); `.txt`/`.docx`/`.rtf` get a plain-text fallback editor.

## Stack (locked by product spec)
- **Tauri v2** — Rust backend, system webview. Small installers, low memory.
- **Vanilla TypeScript + Vite** — no framework; the app shell is a handful of DOM elements.
- **Milkdown Crepe** (`@milkdown/crepe`) — ProseMirror-based WYSIWYG Markdown editor. Provides input rules (`# ` → heading, `**bold**`, lists, quotes), editable tables, task-list checkboxes, code blocks with CodeMirror highlighting, slash menu, selection toolbar, image blocks. Lazy-loaded so cold start stays instant.
- **mammoth** — docx → markdown import, lazy-loaded on first use.
- Minimal hand-written RTF → plain-text converter (basic support only, per spec).

## Architecture
- **Rust side** (`src-tauri/src/main.rs`): four commands — `read_text_file` (lossy UTF-8 fallback), `write_text_file`, `read_binary_file` (raw IPC response for docx), `cli_open_path` (file-association/“Open with” args). Dialog plugin for native open/save dialogs. No fs-plugin scope config needed since IO goes through explicit commands.
- **Frontend state** (`src/app.ts`): one `AppState` — current file (path, kind, saved text), editor mode (`wysiwyg` | `source` | `plain`), dirty flag. All open/save/close flows route through it.
- **Editors**: `editor/markdown.ts` wraps Crepe; `editor/plaintext.ts` is a styled `<textarea>` used for both plain-text files and the “show source” view. Toggling source serializes Crepe → markdown → textarea and back.
- **Syntax reveal** (`editor/syntax-reveal.ts`): ProseMirror decoration plugin. When the cursor is inside a heading, blockquote, or inline mark (bold/italic/code/strike/link), widget decorations display the underlying markers (`##`, `>`, `**`…) beside the formatted text; they disappear when the cursor leaves. Markers are informational (WYSIWYG editing remains the edit path); full marker-editing à la Typora is out of scope — noted in future enhancements.
- **File routing** by extension: markdown exts → WYSIWYG; `.docx`/`.rtf` → converted import (save-as becomes `.md`/`.txt` — we never write docx/rtf); everything else → plain text. Files > 1 MB of markdown open in source mode first with a “Render anyway” notice (perf guard).

## Design system
Tokens in `src/styles/tokens.css`. Warm paper light theme (`#f4f1ec`/`#2b2926`), warm charcoal dark theme; single red accent `#de4a3c` (slightly lifted in dark). No `#000`/`#fff`. Crepe’s `--crepe-*` variables are mapped onto the tokens so the editor obeys the same palette.

## Builds
`tauri.conf.json` bundles msi + nsis (Windows) and dmg/app (macOS), `targets: "all"` (host-filtered). GitHub Actions workflow builds on tag push: windows x86_64, windows aarch64 (cross-target), macOS universal. Signing documented in README (user must supply certs).

## Error handling
- File IO errors surface in the notice bar.
- Unsaved changes: intercepted window close + in-app 3-way modal (Save / Discard / Cancel); same guard before open/new/drag-drop replace.

## Testing
Manual verification via dev build; `cargo check` + `tsc` + release build in CI. (No test framework — deliberate, footprint.)
