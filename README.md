# Marginalia

A lightweight, cross-platform, **WYSIWYG Markdown-first** text editor. Markdown renders live as you type — headings, bold, lists, tables, task lists, code blocks — with no preview pane; the editing surface *is* the document. Plain-text formats (`.txt`, `.docx`, `.rtf`, logs, config files…) open in a fast basic editor.

Built with **Tauri v2** (Rust + system webview) and **Milkdown/ProseMirror** — installers are a few MB, memory stays low, cold start is instant.

## Features

- **True inline WYSIWYG** for Markdown (Typora/Notion style): type `# `, `**bold**`, `- `, `> `, `` ` `` and watch them render in place.
- **Contextual syntax reveal**: put the cursor inside a heading, bold/italic/code span, link, or blockquote and the underlying Markdown markers appear beside it; move away and they hide again.
- **Show source** toggle (`Ctrl+/` / `Cmd+/`) flips the whole document to raw Markdown and back.
- Slash-command menu (type `/` for headings, tables, code blocks, lists, images…), block drag handles, and a selection formatting toolbar (via Milkdown Crepe).
- Editable **tables**, clickable **task-list checkboxes**, **code blocks with syntax highlighting** (lazy-loaded per language), nested lists, inline images.
- `.docx` → Markdown import (via mammoth) and basic `.rtf` → text import; both save as new files, originals are never overwritten.
- Open / save / save-as, recent files, drag-and-drop to open, "Open with" file associations for `.md`/`.txt`, unsaved-changes protection, live word/character count.
- Light & dark themes on a warm-neutral palette with a single red accent — all tokens in [`src/styles/tokens.css`](src/styles/tokens.css).
- Large-file guard: very large Markdown files open in source view first (with one-click "Render anyway") so the app never stalls.

## Keyboard shortcuts

| Action | Windows/Linux | macOS |
| --- | --- | --- |
| New file | `Ctrl+N` | `Cmd+N` |
| Open | `Ctrl+O` | `Cmd+O` |
| Save | `Ctrl+S` | `Cmd+S` |
| Save as | `Ctrl+Shift+S` | `Cmd+Shift+S` |
| Toggle source view | `Ctrl+/` | `Cmd+/` |
| Bold / italic, etc. | Standard ProseMirror bindings (`Ctrl+B`, `Ctrl+I`…) | (`Cmd+B`, `Cmd+I`…) |

## Repository layout

```
├── index.html               App shell (toolbar, editor host, status bar, modal)
├── src/                     Frontend (vanilla TypeScript + Vite)
│   ├── main.ts              Bootstrap: shortcuts, drag-drop, close guard, menus
│   ├── app.ts               Document lifecycle: open/save/import/mode switching
│   ├── editor/
│   │   ├── markdown.ts      Milkdown Crepe WYSIWYG wrapper (lazy-loaded)
│   │   ├── syntax-reveal.ts ProseMirror plugin: markers appear at the cursor
│   │   └── plaintext.ts     Textarea editor (plain files + source view)
│   ├── files/               Tauri IO wrappers, docx/rtf import, recent files
│   ├── ui/                  Theme, status bar, modal, notice bar
│   └── styles/              tokens.css (design system), app.css, editor.css
├── src-tauri/               Rust backend: fs commands, window config, bundling
└── .github/workflows/       Tag-triggered release builds
```

## Development

Prerequisites: [Node 20+](https://nodejs.org), [Rust stable](https://rustup.rs), and on Windows the Visual Studio C++ Build Tools (MSVC).

```sh
npm install
npm run tauri dev      # run the desktop app with hot reload
npm run build          # type-check + build frontend only
```

## Building installers locally

```sh
npm run tauri build
```

Output lands in `src-tauri/target/release/bundle/`:

- **Windows x86-64** (on an x64 machine): `msi/Marginalia_*_x64_en-US.msi` and `nsis/Marginalia_*_x64-setup.exe`
- **Windows ARM64**: `rustup target add aarch64-pc-windows-msvc`, then
  `npm run tauri build -- --target aarch64-pc-windows-msvc --bundles nsis`
  (WiX/MSI cannot cross-compile to ARM64 from x64; NSIS can.)
- **macOS universal** (on a Mac): `rustup target add aarch64-apple-darwin x86_64-apple-darwin`, then
  `npm run tauri build -- --target universal-apple-darwin` → `dmg/Marginalia_*_universal.dmg`

## Releases via CI

Pushing a tag like `v0.1.0` runs [.github/workflows/release.yml](.github/workflows/release.yml), which builds **Windows x64 (msi + nsis)**, **Windows ARM64 (nsis)**, and a **macOS universal dmg**, and attaches them to a draft GitHub Release:

```sh
git tag v0.1.0
git push origin v0.1.0
```


## Design system

All colour/typography/spacing tokens live in [`src/styles/tokens.css`](src/styles/tokens.css): a warm-paper light theme (`#f4f1ec` / `#2b2926`), a warm-charcoal dark theme, and one vibrant accent (`#de4a3c`). No pure black or white anywhere. Milkdown's `--crepe-*` variables are mapped onto the same tokens, so the editor and chrome always agree.

## Deliberately left out (future enhancements)

Kept out to stay lightweight — all are natural next steps:

- **Editable syntax markers** — revealed markers are display-only; full Typora-style editing of the raw markers in place needs a custom ProseMirror node-view layer.
- Tabs / multi-document windows, and a session-restore.
- Find & replace (plain source view has the browser's native find via `Ctrl+F` in dev builds only).
- Export to PDF/HTML, print styling.
- Front-matter (YAML) awareness, footnotes, Mermaid diagrams, LaTeX math (Crepe supports LaTeX — deliberately disabled to trim the bundle).
- Spell check, autosave, file watching for external changes.
- Writing `.docx`/`.rtf` back out (imports are one-way by design).
- Linux packages (deb/rpm/AppImage) — Tauri supports them; add a matrix entry when needed.
