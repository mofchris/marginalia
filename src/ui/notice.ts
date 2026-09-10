const bar = document.getElementById("notice-bar")!;
const textEl = document.getElementById("notice-text")!;
const actionBtn = document.getElementById("notice-action") as HTMLButtonElement;
const closeBtn = document.getElementById("notice-close") as HTMLButtonElement;

let onAction: (() => void) | null = null;
/** Guards the deferred write below against a notice replaced or dismissed first. */
let seq = 0;

closeBtn.addEventListener("click", () => hideNotice());
actionBtn.addEventListener("click", () => {
  const fn = onAction;
  hideNotice();
  fn?.();
});

export function showNotice(message: string, action?: { label: string; run: () => void }): void {
  const mine = ++seq;
  if (action) {
    actionBtn.textContent = action.label;
    actionBtn.hidden = false;
    onAction = action.run;
  } else {
    actionBtn.hidden = true;
    onAction = null;
  }

  // The bar is a live region, so reveal it before writing the message: a region
  // that is still display:none when its text changes may never be announced.
  // Clearing first also guarantees a mutation when the same message repeats,
  // which would otherwise be silent.
  textEl.textContent = "";
  bar.hidden = false;
  requestAnimationFrame(() => {
    if (seq === mine) textEl.textContent = message;
  });
}

export function hideNotice(): void {
  seq++;
  bar.hidden = true;
  textEl.textContent = "";
  onAction = null;
}
