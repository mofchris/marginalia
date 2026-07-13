const KEY = "marginalia.theme";

export function initTheme(): void {
  const stored = localStorage.getItem(KEY);
  const system = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  applyTheme(stored === "light" || stored === "dark" ? stored : system);
}

export function toggleTheme(): void {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem(KEY, next);
}

function applyTheme(theme: string): void {
  document.documentElement.dataset.theme = theme;
}
