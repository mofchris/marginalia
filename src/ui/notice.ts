const bar = document.getElementById("notice-bar")!;
const textEl = document.getElementById("notice-text")!;
const actionBtn = document.getElementById("notice-action") as HTMLButtonElement;
const closeBtn = document.getElementById("notice-close") as HTMLButtonElement;

let onAction: (() => void) | null = null;

closeBtn.addEventListener("click", () => hideNotice());
actionBtn.addEventListener("click", () => {
  const fn = onAction;
  hideNotice();
  fn?.();
});

export function showNotice(message: string, action?: { label: string; run: () => void }): void {
  textEl.textContent = message;
  if (action) {
    actionBtn.textContent = action.label;
    actionBtn.hidden = false;
    onAction = action.run;
  } else {
    actionBtn.hidden = true;
    onAction = null;
  }
  bar.hidden = false;
}

export function hideNotice(): void {
  bar.hidden = true;
  onAction = null;
}
