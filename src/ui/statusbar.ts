const wordsEl = document.getElementById("status-words")!;
const typeEl = document.getElementById("status-type")!;

export function updateWordCount(text: string): void {
  // Strip common markdown syntax so counts reflect prose, not markers.
  const prose = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~[\]()|-]+/g, " ");
  const words = prose.match(/\S+/g)?.length ?? 0;
  const chars = text.replace(/\s/g, "").length;
  wordsEl.textContent = `${words.toLocaleString()} words · ${chars.toLocaleString()} characters`;
}

export function setStatusType(label: string): void {
  typeEl.textContent = label;
}
