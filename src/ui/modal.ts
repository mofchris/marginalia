interface ModalChoice {
  label: string;
  value: string;
  primary?: boolean;
}

const backdrop = document.getElementById("modal-backdrop")!;
const messageEl = document.getElementById("modal-message")!;
const actionsEl = document.getElementById("modal-actions")!;

/** Show a blocking in-app dialog; resolves with the chosen value. */
export function showModal(message: string, choices: ModalChoice[]): Promise<string> {
  return new Promise((resolve) => {
    messageEl.textContent = message;
    actionsEl.innerHTML = "";
    for (const choice of choices) {
      const btn = document.createElement("button");
      btn.className = choice.primary ? "primary-btn" : "ghost-btn";
      btn.textContent = choice.label;
      btn.addEventListener("click", () => {
        backdrop.hidden = true;
        resolve(choice.value);
      });
      actionsEl.appendChild(btn);
    }
    backdrop.hidden = false;
    actionsEl.querySelector<HTMLElement>(".primary-btn, .ghost-btn")?.focus();
  });
}

/** Save / Discard / Cancel guard used before anything replaces a dirty document. */
export async function confirmDiscard(fileName: string): Promise<"save" | "discard" | "cancel"> {
  const result = await showModal(`Save changes to “${fileName}” before closing?`, [
    { label: "Save", value: "save", primary: true },
    { label: "Don’t save", value: "discard" },
    { label: "Cancel", value: "cancel" },
  ]);
  return result as "save" | "discard" | "cancel";
}
