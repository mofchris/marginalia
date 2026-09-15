import { readFileSync } from 'node:fs';
import { beforeEach, expect, test, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = readFileSync('index.html', 'utf8');
});

// The module looks its elements up on import, so import after the markup exists.
async function startEditing(name = 'Untitled.md') {
  const commit = vi.fn(async (_name: string, _confirmed: boolean) => true);
  const { initFileTitle } = await import('../src/ui/filetitle');
  initFileTitle(commit, () => true);
  document.getElementById('file-name')!.textContent = name;
  document.getElementById('file-name-btn')!.click();
  return { commit, input: document.getElementById('file-name-input') as HTMLInputElement };
}

test('pressing Enter confirms the name, even when it is unchanged', async () => {
  const { commit, input } = await startEditing();
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await Promise.resolve();
  expect(commit).toHaveBeenCalledWith('Untitled.md', true);
});

test('clicking away renames without confirming', async () => {
  const { commit, input } = await startEditing();
  input.value = 'draft.md';
  input.dispatchEvent(new FocusEvent('blur'));
  await Promise.resolve();
  expect(commit).toHaveBeenCalledWith('draft.md', false);
});

test('clicking away without a change, or pressing Escape, does nothing', async () => {
  const { commit, input } = await startEditing();
  input.dispatchEvent(new FocusEvent('blur'));
  const again = await startEditing();
  again.input.value = 'changed.md';
  again.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await Promise.resolve();
  expect(commit).not.toHaveBeenCalled();
  expect(again.commit).not.toHaveBeenCalled();
});
