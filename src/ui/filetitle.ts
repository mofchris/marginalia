const btnEl = document.getElementById("file-name-btn") as HTMLButtonElement;
const nameEl = document.getElementById("file-name")!;
const inputEl = document.getElementById("file-name-input") as HTMLInputElement;

let editing = false;
let cancelled = false;

/** `confirmed` is true when the name was committed with Enter rather than by clicking away. */
type Commit = (name: string, confirmed: boolean) => Promise<boolean>;

/**
 * Click-to-rename on the top bar title. `commit` performs the actual rename
 * and reports success; `canEdit` gates it so the welcome screen isn't editable.
 * The dirty dot is left alone throughout — renaming never changes that state.
 *
 * The trigger is a real <button> rather than a click handler on the title div,
 * so it is reachable by Tab and activates on Enter and Space for free.
 */
export function initFileTitle(commit: Commit, canEdit: () => boolean): void {
  btnEl.addEventListener("click", () => {
    if (!editing && canEdit()) begin();
  });

  // Enter and Escape finish the edit themselves rather than going through
  // blur(): if the input ever loses focus without us seeing a blur event, a
  // blur-only path would leave the field stuck open with no way out. Hiding
  // the input in end() blurs it, so the blur listener below fires afterwards
  // and harmlessly no-ops.
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void end(commit, true, true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelled = true;
      void end(commit, true, false);
    }
    // Keep editing keystrokes away from the global shortcut handler.
    e.stopPropagation();
  });

  inputEl.addEventListener("blur", () => void end(commit, false, false));
}

function begin(): void {
  editing = true;
  cancelled = false;
  const name = nameEl.textContent ?? "";
  inputEl.value = name;
  inputEl.size = Math.max(12, name.length + 1);

  btnEl.hidden = true;
  inputEl.hidden = false;
  inputEl.focus();

  // Select the stem but not the extension, like Explorer and VS Code do.
  const dot = name.lastIndexOf(".");
  inputEl.setSelectionRange(0, dot > 0 ? dot : name.length);
}

/**
 * `restoreFocus` is set only when the edit was ended deliberately from the
 * keyboard, so focus returns to the button the user started from. A blur
 * caused by clicking elsewhere must not yank focus back.
 */
async function end(commit: Commit, restoreFocus: boolean, confirmed: boolean): Promise<void> {
  if (!editing) return;
  editing = false;

  const next = inputEl.value.trim();
  const previous = nameEl.textContent ?? "";

  inputEl.hidden = true;
  btnEl.hidden = false;
  if (restoreFocus) btnEl.focus();

  // Enter still commits an unchanged name: for a document that has never been
  // saved, confirming the name is how it gets saved.
  if (cancelled || !next || (next === previous && !confirmed)) return;
  // On failure app.ts reports why and leaves the old name in place.
  await commit(next, confirmed);
}
