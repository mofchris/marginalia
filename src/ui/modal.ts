import { setOverlayVisible } from './motion';

interface ModalChoice {
  label: string;
  value: string;
  primary?: boolean;
  /** Marks the choice that loses data, so it can be told apart from Cancel. */
  destructive?: boolean;
  /** Value Escape resolves to. Exactly one choice should set this. */
  escape?: boolean;
}

const backdrop = document.getElementById("modal-backdrop")!;
const messageEl = document.getElementById("modal-message")!;
const actionsEl = document.getElementById("modal-actions")!;
const dialogEl = backdrop.querySelector<HTMLElement>(".modal");

/** Show a blocking in-app dialog; resolves with the chosen value. */
export function showModal(message: string, choices: ModalChoice[]): Promise<string> {
  return new Promise((resolve) => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    messageEl.textContent = message;
    actionsEl.innerHTML = "";

    // Escape resolves to the choice that changes nothing; falling back to the
    // last one keeps the dialog dismissible even if no choice opts in.
    const escapeValue =
      choices.find((c) => c.escape)?.value ?? choices[choices.length - 1]?.value;

    let settled = false;
    const close = (value: string): void => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKeydown, true);
      setOverlayVisible(backdrop, false);
      previouslyFocused?.focus?.();
      resolve(value);
    };

    function onKeydown(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        e.preventDefault();
        close(escapeValue);
        return;
      }
      if (e.key === "Enter" && document.activeElement === dialogEl) {
        // The dialog holds focus, so give Enter the default action.
        e.preventDefault();
        actionsEl.querySelector<HTMLButtonElement>(".primary-btn")?.click();
        return;
      }
      if (e.key === "Tab") {
        // Keep focus inside the dialog: it is modal, so Tab must not reach the
        // editor behind it.
        const items = [...actionsEl.querySelectorAll<HTMLButtonElement>("button")];
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        const outside = !actionsEl.contains(active);
        if (e.shiftKey && (active === first || outside)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (active === last || outside)) {
          e.preventDefault();
          first.focus();
        }
      }
      // Swallow everything else so app shortcuts can't fire behind the dialog.
      e.stopPropagation();
    }

    for (const choice of choices) {
      const btn = document.createElement("button");
      btn.className = choice.primary
        ? "primary-btn"
        : choice.destructive
          ? "danger-btn"
          : "ghost-btn";
      btn.textContent = choice.label;
      btn.addEventListener("click", () => close(choice.value));
      actionsEl.appendChild(btn);
    }

    setOverlayVisible(backdrop, true);
    // Listen in the capture phase so the dialog sees keys before the window
    // level shortcut handler does.
    document.addEventListener("keydown", onKeydown, true);
    // Focus the dialog rather than a button: focusing a button paints a focus
    // ring on it the moment the dialog opens, which reads as a stray border on
    // the primary action. Enter still triggers it, and Tab reaches the buttons.
    dialogEl?.focus();
  });
}

/** Save / Discard / Cancel guard used before anything replaces a dirty document. */
export async function confirmDiscard(fileName: string): Promise<"save" | "discard" | "cancel"> {
  const result = await showModal(`Save changes to “${fileName}” before closing?`, [
    { label: "Save", value: "save", primary: true },
    { label: "Don’t save", value: "discard", destructive: true },
    { label: "Cancel", value: "cancel", escape: true },
  ]);
  return result as "save" | "discard" | "cancel";
}
