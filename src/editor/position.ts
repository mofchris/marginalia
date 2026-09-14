import type { EditorPosition } from '../types';

export function captureTextPosition(text: string, from: number, to: number, scrollTop = 0): EditorPosition {
  return { from, to, before: text.slice(Math.max(0, from - 32), from), after: text.slice(from, from + 32), scrollTop };
}

/** Match nearby words when Markdown markers shift raw offsets between views. */
export function locatePosition(text: string, position: EditorPosition): { from: number; to: number } {
  let from = Math.min(text.length, Math.max(0, position.from));
  const context = position.before + position.after;
  const closest = (needle: string): number => {
    let best = -1;
    let at = text.indexOf(needle);
    while (at !== -1) {
      if (best < 0 || Math.abs(at - position.from) < Math.abs(best - position.from)) best = at;
      at = text.indexOf(needle, at + 1);
    }
    return best;
  };
  const exact = context ? closest(context) : -1;
  if (exact >= 0) from = exact + position.before.length;
  else {
    for (const length of [24, 12, 6]) {
      const after = position.after.slice(0, length);
      const before = position.before.slice(-length);
      const a = after.length >= 3 ? closest(after) : -1;
      const b = before.length >= 3 ? closest(before) : -1;
      if (a >= 0) { from = a; break; }
      if (b >= 0) { from = b + before.length; break; }
    }
  }
  return { from, to: Math.min(text.length, from + Math.max(0, position.to - position.from)) };
}
