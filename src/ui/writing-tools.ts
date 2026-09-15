import type { EditorSurface } from '../types';
import { findMatches, type TextMatch } from '../editor/search';
import { transitionLayout } from './motion';

export function initWritingTools(getEditor: () => EditorSurface | null): void {
  const el = (id: string) => document.getElementById(id)!;
  const on = (id: string, action: () => void) => el(id).addEventListener('click', action);
  const bar = el('find-bar');
  const query = el('find-query') as HTMLInputElement;
  const replacement = el('replace-text') as HTMLInputElement;
  const caseToggle = el('find-case');
  const findButton = el('btn-find');
  const outline = el('outline-panel');
  let matches: TextMatch[] = [];
  let index = 0;
  let matchCase = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Matches are highlighted rather than selected: an editor only paints and
  // scrolls to its own selection while focused, and the find bar holds focus.
  function refreshSearch(): void {
    const editor = getEditor();
    matches = findMatches(editor?.getSearchText?.() ?? '', query.value, matchCase);
    index = Math.max(0, Math.min(index, matches.length - 1));
    el('find-count').textContent = !query.value ? '' : matches.length ? `${index + 1} of ${matches.length}` : 'No matches';
    for (const id of ['find-prev', 'find-next', 'replace-one', 'replace-all']) (el(id) as HTMLButtonElement).disabled = !matches.length;
    editor?.showMatches?.(matches, index);
  }
  function openFind(replace = false): void {
    if (!getEditor()) return;
    transitionLayout(() => { bar.hidden = false; el('replace-row').hidden = !replace; });
    el('replace-toggle').setAttribute('aria-expanded', String(replace));
    findButton.setAttribute('aria-pressed', 'true');
    query.focus(); query.select(); refreshSearch();
  }
  function closeFind(): void {
    const editor = getEditor();
    const match = query.value ? matches[index] : undefined;
    transitionLayout(() => { bar.hidden = true; });
    findButton.setAttribute('aria-pressed', 'false');
    editor?.clearMatches?.();
    editor?.focus();
    // Closing lands the caret on the match that was current.
    if (match) editor?.selectRange?.(match.from, match.to);
  }
  function navigate(direction: number): void {
    if (!matches.length) return;
    index = (index + direction + matches.length) % matches.length; refreshSearch();
  }
  function replace(all: boolean): void {
    refreshSearch();
    if (!matches.length) return;
    getEditor()?.replaceRanges?.(all ? matches : [matches[index]], replacement.value);
    refreshSearch();
  }
  query.addEventListener('input', () => { index = 0; refreshSearch(); });
  on('find-case', () => {
    matchCase = !matchCase;
    caseToggle.setAttribute('aria-pressed', String(matchCase));
    index = 0; refreshSearch();
  });
  bar.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeFind(); }
    // Only from the search box: Enter on a button in the bar must press that button.
    else if (event.key === 'Enter' && event.target === query) { event.preventDefault(); navigate(event.shiftKey ? -1 : 1); }
    event.stopPropagation();
  });
  on('btn-find', () => { if (bar.hidden) openFind(); else closeFind(); });
  on('find-close', closeFind);
  on('find-prev', () => navigate(-1)); on('find-next', () => navigate(1));
  on('replace-toggle', () => {
    transitionLayout(() => { el('replace-row').hidden = !el('replace-row').hidden; });
    el('replace-toggle').setAttribute('aria-expanded', String(!el('replace-row').hidden));
  });
  on('replace-one', () => replace(false)); on('replace-all', () => replace(true));
  function refreshOutline(): void {
    if (outline.hidden) return;
    const list = el('outline-items'); list.replaceChildren();
    const headings = getEditor()?.getHeadings?.() ?? [];
    if (!headings.length) {
      const text = document.createElement('p'); text.textContent = 'No headings in this document.'; list.appendChild(text);
    }
    for (const heading of headings) {
      const button = document.createElement('button'); button.className = 'outline-item';
      button.textContent = heading.text || 'Untitled heading'; button.style.paddingLeft = `${8 + (heading.level - 1) * 10}px`;
      button.addEventListener('click', () => { getEditor()?.selectRange?.(heading.from, heading.from); getEditor()?.focus(); });
      list.appendChild(button);
    }
  }
  function toggleOutline(): void {
    transitionLayout(() => { outline.hidden = !outline.hidden; refreshOutline(); });
    el('btn-outline').setAttribute('aria-pressed', String(!outline.hidden));
    if (outline.hidden) getEditor()?.focus();
  }
  function toggleFocus(): void {
    const enabled = document.body.dataset.focus !== 'true';
    transitionLayout(() => { document.body.dataset.focus = String(enabled); });
    el('exit-focus').hidden = !enabled; el('btn-focus').setAttribute('aria-pressed', String(enabled)); getEditor()?.focus();
    delete document.body.dataset.typing;
  }
  on('btn-outline', toggleOutline); on('outline-close', toggleOutline);
  on('btn-focus', toggleFocus); on('exit-focus', toggleFocus);
  // In focus mode the exit control steps aside once typing starts and returns
  // as soon as the pointer moves, so it is there when reached for but not in view.
  document.addEventListener('keydown', event => {
    if (document.body.dataset.focus !== 'true' || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Enter') document.body.dataset.typing = 'true';
  });
  document.addEventListener('mousemove', () => { delete document.body.dataset.typing; });
  document.addEventListener('document-change', () => {
    clearTimeout(timer); timer = setTimeout(() => { if (!bar.hidden) refreshSearch(); refreshOutline(); }, 180);
  });
  window.addEventListener('keydown', event => {
    if (!el('modal-backdrop').hidden) return;
    const mod = event.ctrlKey || event.metaKey, key = event.key.toLowerCase();
    if (mod && (key === 'f' || key === 'h')) { event.preventDefault(); openFind(key === 'h'); }
    else if (mod && event.shiftKey && key === 'o') { event.preventDefault(); toggleOutline(); }
    else if (event.key === 'F8' || (event.key === 'Escape' && document.body.dataset.focus === 'true')) { event.preventDefault(); toggleFocus(); }
  });
}
