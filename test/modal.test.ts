import { readFileSync } from 'node:fs';
import { beforeEach, expect, test, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = readFileSync('index.html', 'utf8');
});

test('Escape cancels the save dialog and restores focus', async () => {
  const { confirmDiscard } = await import('../src/ui/modal');
  const origin = document.getElementById('btn-new')!;
  origin.focus();
  const result = confirmDiscard('notes.md');
  expect(document.activeElement).toBe(document.querySelector('.modal'));
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(await result).toBe('cancel');
  expect(document.activeElement).toBe(origin);
});

test('Tab wraps inside the dialog and document commands do not escape', async () => {
  const { confirmDiscard } = await import('../src/ui/modal');
  const result = confirmDiscard('notes.md');
  const buttons = document.querySelectorAll<HTMLButtonElement>('#modal-actions button');
  buttons[2].focus();
  buttons[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
  expect(document.activeElement).toBe(buttons[0]);
  const command = vi.fn();
  window.addEventListener('keydown', command);
  buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'n', ctrlKey: true, bubbles: true }));
  expect(command).not.toHaveBeenCalled();
  window.removeEventListener('keydown', command);
  buttons[2].click();
  expect(await result).toBe('cancel');
});
