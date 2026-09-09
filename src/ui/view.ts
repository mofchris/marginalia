const ZOOM_KEY = "marginalia.zoom";
const WIDTH_KEY = "marginalia.width";

/** Word-style zoom ladder, in percent. */
const ZOOM_STEPS = [50, 67, 75, 90, 100, 110, 125, 150, 175, 200, 250, 300];
const DEFAULT_ZOOM = 100;

export type WidthMode = "narrow" | "wide" | "full";
const WIDTH_MODES: WidthMode[] = ["narrow", "wide", "full"];
const WIDTH_LABELS: Record<WidthMode, string> = {
  narrow: "Narrow",
  wide: "Wide",
  full: "Full",
};

const editorRoot = document.getElementById("editor-root")!;
const widthBtn = document.getElementById("btn-width")!;
const zoomLabel = document.getElementById("btn-zoom-reset")!;

let zoom = DEFAULT_ZOOM;
let width: WidthMode = "narrow";

export function initView(): void {
  zoom = nearestStep(Number(localStorage.getItem(ZOOM_KEY)) || DEFAULT_ZOOM);
  const storedWidth = localStorage.getItem(WIDTH_KEY);
  width = isWidthMode(storedWidth) ? storedWidth : "narrow";
  apply();
}

export function stepZoom(direction: 1 | -1): void {
  const i = ZOOM_STEPS.indexOf(nearestStep(zoom));
  const next = ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, i + direction))];
  if (next === zoom) return;
  zoom = next;
  persist();
  apply();
}

export function resetZoom(): void {
  if (zoom === DEFAULT_ZOOM) return;
  zoom = DEFAULT_ZOOM;
  persist();
  apply();
}

export function cycleWidth(): void {
  width = WIDTH_MODES[(WIDTH_MODES.indexOf(width) + 1) % WIDTH_MODES.length];
  persist();
  apply();
}

/*
 * Wheel deltas vary wildly by device: a mouse notch arrives as one large event
 * (deltaY ±100, or ±3 in line mode), while a trackpad pinch streams dozens of
 * tiny ones. Clamping each event's contribution to exactly one step's worth
 * makes a single notch move a single step, and lets a pinch accumulate.
 */
const WHEEL_STEP = 40;
let wheelAcc = 0;

export function zoomByWheel(deltaY: number, deltaMode = 0): void {
  const pixels = deltaMode === 0 ? deltaY : deltaY * 16;
  if (Math.sign(pixels) !== Math.sign(wheelAcc)) wheelAcc = 0;
  wheelAcc += Math.sign(pixels) * Math.min(Math.abs(pixels), WHEEL_STEP);
  while (Math.abs(wheelAcc) >= WHEEL_STEP) {
    // Wheel-down (positive delta) zooms out, matching every other app.
    stepZoom(wheelAcc > 0 ? -1 : 1);
    wheelAcc -= Math.sign(wheelAcc) * WHEEL_STEP;
  }
}

function apply(): void {
  editorRoot.style.setProperty("--zoom", String(zoom / 100));
  editorRoot.dataset.width = width;
  zoomLabel.textContent = `${zoom}%`;
  widthBtn.textContent = WIDTH_LABELS[width];
}

function persist(): void {
  localStorage.setItem(ZOOM_KEY, String(zoom));
  localStorage.setItem(WIDTH_KEY, width);
}

/** Snap an arbitrary percentage onto the ladder so stepping stays predictable. */
function nearestStep(pct: number): number {
  return ZOOM_STEPS.reduce((best, s) =>
    Math.abs(s - pct) < Math.abs(best - pct) ? s : best,
  );
}

function isWidthMode(value: string | null): value is WidthMode {
  return value === "narrow" || value === "wide" || value === "full";
}
