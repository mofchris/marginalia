const KEY = "marginalia.recentFiles";
const MAX = 8;

export function getRecentFiles(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((p): p is string => typeof p === "string") : [];
  } catch {
    return [];
  }
}

export function addRecentFile(path: string): void {
  const list = [path, ...getRecentFiles().filter((p) => p !== path)].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function removeRecentFile(path: string): void {
  localStorage.setItem(KEY, JSON.stringify(getRecentFiles().filter((p) => p !== path)));
}
