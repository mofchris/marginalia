# Marginalia

This is the original Marginalia source folder, updated with the verified polish work from `../Marginalia-Polish`. It retains the original app identifier (`app.marginalia.editor`) and development port (1420). See [CHECKPOINT.md](CHECKPOINT.md) for transfer and verification details.

A lightweight, cross-platform, **WYSIWYG Markdown-first** text editor. Markdown renders live as you type — headings, bold, lists, tables, task lists, code blocks — with no preview pane; the editing surface *is* the document. Plain-text formats (`.txt`, `.docx`, `.rtf`, logs, config files…) open in a fast basic editor.

Built with **Tauri v2** (Rust + system webview) and **Milkdown/ProseMirror** — installers are a few MB, memory stays low, cold start is instant.

## Features

- **True inline WYSIWYG** for Markdown (Typora/Notion style): type `# `, `**bold**`, `- `, `> `, `` ` `` and watch them render in place.
- **Contextual syntax reveal**: put the cursor inside a heading, bold/italic/code span, link, or blockquote and the underlying Markdown markers appear beside it; move away and they hide again.
- **Show source** toggle (`Ctrl+/` / `Cmd+/`) flips the whole document to raw Markdown and back.
- **View continuity**: retained editor instances and undo history, with caret context and scroll restored when switching views. Source editing uses CodeMirror.
- **Responsive motion**: immediate press feedback, interruptible panel/layout transitions, short view fades and Reduce Motion support. Native controls and scrollbars follow the selected theme.
- **Balanced toolbar**: the filename stays at the window centre, with source/theme controls at the far right. Narrow windows keep every control available on a second row.
- **Find and replace** with literal text matching, match navigation, case sensitivity and undoable replacement.
- **Heading outline** in formatted and Markdown source views, plus a focus mode that hides controls while writing. Source navigation recognizes ATX and setext headings, excluding code and HTML blocks.
- **Draft recovery** and session resume, visible save status, and protection against edits made while a save is in progress. Recovery is local to this app; disk changes are checked on focus and before saving.
- **Accurate unsaved state**: loading or synchronizing the formatted editor does not count as an edit; actual edits are tracked immediately, and undoing back to saved text clears the save prompt.
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
| Find / replace | `Ctrl+F` / `Ctrl+H` | `Cmd+F` / `Cmd+H` |
| Heading outline | `Ctrl+Shift+O` | `Cmd+Shift+O` |
| Focus mode / exit | `F8` / `Esc` | `F8` / `Esc` |
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
│   │   └── plaintext.ts     CodeMirror editor (plain files + source view)
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
npm run check          # typecheck → lint → tests → build → Rust check
npm run check -- test   # one phase for quick iteration
```

The full gate stops at the first failing phase and writes results and a source fingerprint to `.checkpoints/last-check.json`. A single-phase run does not replace the full gate. Rust must be installed to pass the native phase.

For a runnable Windows build without an installer or file-association registration:

```sh
npm run tauri build -- --no-bundle
```

The optimized executable is `src-tauri/target/release/marginalia.exe`. Native Open, Save As cancellation, forced-stop draft recovery, disk saving and conflict-to-copy behavior were exercised in the isolated Windows preview before transfer. The original app identity is verified separately by the gate in this folder. Limited native timing samples and their boundaries are recorded in [MOTION-TESTING.md](MOTION-TESTING.md). Normal builds omit the optional performance probe.

## Building installers locally

The new folded-page logo uses Marginalia's warm red and cream palette. Its master is `assets/branding/marginalia-logo.png` (also `app-icon.png` for Tauri's default icon command). The previous source and icons are preserved in the sibling backup folder recorded in CHECKPOINT.md.

The Windows NSIS `.exe` installer explicitly uses the app logo for installer/uninstaller icons and custom welcome/header artwork. Regenerate assets after replacing the master:

```powershell
npm run tauri icon -- assets/branding/marginalia-logo.png --ios-color '#de4a3c'
./scripts/installer-art.ps1
npm run tauri build -- --bundles nsis
```

Building creates an installer; it does not install the app or register associations. Installer artwork conversion is deterministic and uses Windows System.Drawing. The sidebar is 164×314 and header 150×57, both 24-bit BMPs required by NSIS.

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
- Tabs / multi-document windows.
- Margin notes.
- Export to PDF/HTML, print styling.
- Front-matter (YAML) awareness, footnotes, Mermaid diagrams, LaTeX math (Crepe supports LaTeX — deliberately disabled to trim the bundle).
- Spell check, automatic saving to disk, continuous file watching for external changes (current checks run on focus and before saving).
- Writing `.docx`/`.rtf` back out (imports are one-way by design).
- Linux packages (deb/rpm/AppImage) — Tauri supports them; add a matrix entry when needed.

