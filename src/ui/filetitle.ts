const titleEl = document.getElementById("file-title")!;
const nameEl = document.getElementById("file-name")!;
const inputEl = document.getElementById("file-name-input") as HTMLInputElement;

let editing = false;
let cancelled = false;

/**
 * Click-to-rename on the top bar title. `commit` performs the actual rename
 * and reports success; `canEdit` gates it so the welcome screen isn't editable.
 * The dirty dot is left alone throughout — renaming never changes that state.
 */
export function initFileTitle(
  commit: (name: string) => Promise<boolean>,
  canEdit: () => boolean,
): void {
  titleEl.addEventListener("click", () => {
    if (!editing && canEdit()) begin();
  });

  // Enter and Escape finish the edit themselves rather than going through
  // blur(): if the input ever loses focus without us seeing a blur event, a
  // blur-only path would leave the field stuck open with no way out. end() is
  // idempotent, so the blur listener below is free to fire afterwards too.
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      inputEl.blur();
      void end(commit);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelled = true;
      inputEl.blur();
      void end(commit);
    }
    // Keep editing keystrokes away from the global shortcut handler.
    e.stopPropagation();
  });

  inputEl.addEventListener("blur", () => void end(commit));
}

function begin(): void {
  editing = true;
  cancelled = false;
  const name = nameEl.textContent ?? "";
  inputEl.value = name;
  inputEl.size = Math.max(12, name.length + 1);

  titleEl.classList.add("editing");
  nameEl.hidden = true;
  inputEl.hidden = false;
  inputEl.focus();

  // Select the stem but not the extension, like Explorer and VS Code do.
  const dot = name.lastIndexOf(".");
  inputEl.setSelectionRange(0, dot > 0 ? dot : name.length);
}

async function end(commit: (name: string) => Promise<boolean>): Promise<void> {
  if (!editing) return;
  editing = false;

  const next = inputEl.value.trim();
  const previous = nameEl.textContent ?? "";

  titleEl.classList.remove("editing");
  inputEl.hidden = true;
  nameEl.hidden = false;

  if (cancelled || !next || next === previous) return;
  // On failure app.ts reports why and leaves the old name in place.
  await commit(next);
}
