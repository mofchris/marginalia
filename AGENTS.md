# Marginalia

- This is the original app source. Preserve the `Marginalia` product name, `app.marginalia.editor` identifier and development port 1420.
- Done gate: `npm run check` (typecheck, lint, tests, production frontend build, Rust check), fail-fast. Optional single phase: `npm run check -- <phase>`. Do not report completion without the full gate passing.
- Preserve existing features and user edits. Test save/recovery and editor continuity changes with meaningful regressions. Browser-only checks do not establish native behavior.
- Keep resumable progress in CHECKPOINT.md; gate reports and local evidence belong in the ignored `.checkpoints/` directory.
- Do not install, register file associations, publish, or commit unless requested. Never bypass hooks or add AI attribution trailers.
