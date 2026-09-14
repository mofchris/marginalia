# Marginalia source transfer

The user explicitly requested copying the finished polish work into this original folder on 2026-09-14, superseding the earlier duplicate-only instruction for this transfer.

Backup before copying: `../Marginalia-backup-20260914-214925`. The complete original folder, including Git metadata and existing untracked files, was copied there. Original tracked source matched the v0.1.4 upstream snapshot and Git had no tracked local edits. Existing `.git` and `.claude` in this working folder were preserved.

Copied application source, tests, gate/build configuration, new logo and all platform icons, installer artwork/generation script, and supporting documentation from `../Marginalia-Polish`. Kept original product name `Marginalia`, identifier `app.marginalia.editor`, development URL/port 1420 and window title. Recovery storage is named `marginalia.session.v1`; its test fixture was adjusted to match. Old root SVG was retained in the backup and moved locally to `.checkpoints/previous-app-icon.svg`.

Included work: corrected centred toolbar and far-right view/theme controls; new folded-page logo and branded installer; interruptible motion and Reduce Motion support; retained editors/caret/undo; accurate dirty state and untouched source preservation; safe saves, external-conflict protection and recovery; find/replace, outline and focus mode.

Verification in the original folder is pending. `npm ci` installed the locked dependencies; it reported the same six pre-existing audit findings (four moderate, two high). Run `npm run check` here before reporting the transfer finished. Exact transfer identity and backup location are in `.checkpoints/polish-transfer.json`.

The duplicate and its verified native app/installer remain available. Its native and browser testing evidence is historical evidence for the transferred implementation, not a newly built original-identity executable. This transfer does not install the application, build an original-identity installer, change file associations, commit, or publish to GitHub.
