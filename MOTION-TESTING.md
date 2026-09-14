# Motion and native testing (preview evidence)

These results were collected in the isolated Marginalia-Polish preview before copying its source into the original folder. No native executable was built or installed in the original folder as part of the source transfer. See CHECKPOINT.md for the original folder gate result. Historical evidence remains in ../Marginalia-Polish/.checkpoints.

This pass preserves Marginalia's existing appearance and focuses on response, continuity and control. Work remains in the isolated preview.

## Motion decisions

- Press feedback is immediate. Hover settles in 110 ms.
- Panels enter over 180 ms; editor content settles into changed layouts over 220 ms without scaling text.
- View switches keep focus and editing available immediately, with a 120 ms fade.
- Menus and dialogs arrive over 180 ms and dismiss over 100 ms where discrete CSS transitions are supported. Dismissal updates focus, inertness and accessibility immediately.
- New animations cancel prior movement. Reduce Motion suppresses new movement and cancels active JavaScript animations.
- Native controls and scrollbars follow light/dark mode through `color-scheme`.

These choices follow [Apple's motion guidance](https://developer.apple.com/design/human-interface-guidelines/motion) and use [CSS discrete transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transition-behavior) with an immediate fallback on older engines.

## Reproduce native measurements

Build with `VITE_PERF_PROBE=1` in the environment, then run `npm run tauri build -- --no-bundle`. This compiles an optimized executable with a local Performance button in the status bar. Normal builds omit the probe.

Open `../Marginalia-Polish/.checkpoints/qa-fixtures/native-small.md` or `native-long.md` using the native file picker. Open Performance and reset measurements, exercise view switches, outline, focus, find and editing, then open Performance again. Record the displayed report and runtime.

The probe records frame intervals for 500 ms after input, input-handler-to-second-animation-frame latency, view activation duration and long tasks. It does not measure OS-to-photon latency, and UI automation/screen capture plus other applications can affect timings. This is a bounded native smoke test, not a benchmark across hardware or a claim of Apple-equivalent performance.

## Verification record

- Automated checks: interruption, Reduce Motion, overlay input removal, synchronous fallback, plus editor/save/recovery regression coverage.
- Browser: panel animation CSS, outline focus return, dialog hidden/inert semantics; Impeccable detector returned `[]`.
- Native: optimized release launched by explicit process path; native Open dialog loaded the small disposable fixture. Native Save As cancellation retained text and dirty state. Forced termination of only the isolated preview restored the exact unsaved draft on relaunch. Native Save then wrote the expected text to disk. External-edit conflict refused overwrite, kept the local draft dirty, and Save a copy preserved the local text separately while the external disk version stayed unchanged. Disposable evidence files are in `../Marginalia-Polish/.checkpoints/qa-fixtures`.
- Small-document native measurements: WebView2/Edge 152, Windows, 1100×760, Reduce Motion off. 117 frame intervals: median 16.7 ms, p95 16.9 ms, max 17 ms, zero over 34 ms. Seven input samples: median 19.9 ms, p95/max 27.9 ms. Two view activations: 4.4 and 20.7 ms. Zero observed long tasks. Raw report: `../Marginalia-Polish/.checkpoints/native-small-performance.json`. This limited sample is not a before/after or cross-device benchmark.
- Long-document native measurements: 180 sections, same runtime/window and Reduce Motion off. After resetting the probe, exercised six source/rich switches, source outline open/close, focus mode entry/exit, end-of-document navigation and Page Up. 328 frame intervals: median 16.7 ms, p95 16.9 ms, max 17.3 ms, zero over 34 ms. Nineteen input samples: median 23.2 ms, p95/max 50.1 ms. Six view activations: median 24 ms, p95/max 30.2 ms. Zero observed long tasks. Raw report: `../Marginalia-Polish/.checkpoints/native-long-performance.json`; probe executable fingerprint: `../Marginalia-Polish/.checkpoints/native-performance-build.json`.
- Reduce Motion behavior was verified automatically, not by changing the Windows system preference. No original-app comparison, OS-to-photon measurement, continuous-scroll benchmark, macOS test or cross-device benchmark was performed.

## September 14 close-prompt fix

Real Milkdown regression tests reproduced delayed change notifications after programmatic synchronization and source normalization without editing. Rich-editor change tracking now observes committed document changes synchronously, suppresses initialization/synchronization callbacks and preserves untouched source text. App dirty state compares against saved text, including after undo.

Full `npm run check` passed all five phases and 31 tests. Optimized `npm run tauri build -- --no-bundle` passed without the probe. The native timing reports above precede this fix. Final native close verification could not run: the Windows automation helper failed to initialize its window-opened listener even after a runtime reset. This exact build has automated verification, but no final native smoke result. See CHECKPOINT.md for the reproducible fixture and pending native checks.

## Final native follow-up

The later branding/toolbar build resolved the native testing blocker: launched the executable directly outside the process sandbox, then used sky for UI actions. In `target/x86_64-pc-windows-msvc/release/marginalia.exe`, native-long.md stayed Saved through a source/rich round trip and closed with Alt+F4 without prompting. Relaunched and left the preview open. The centred toolbar and new app icon were also visually verified. Final full gate passed 31 tests; separate browser measurements passed all 28 toolbar width/name/dirty cases. Final artifact hashes and verification scope are in `../Marginalia-Polish/.checkpoints/release-build.json`.

Native automation uses `@oai/sky`. Use `process:` before the executable path; a bare launch path selected the installed original by filename. Confirm the returned window belongs to `Marginalia-Polish` before input. Native file picker's reported accessibility focus can be stale; visually verify filename focus before entering a path.


