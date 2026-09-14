import { beforeEach, expect, test } from 'vitest';
import { readSession, writeSession, recoveryDecision } from '../src/files/recovery';

const session = {
  version: 1 as const,
  file: { path: '/essay.md', name: 'essay.md', kind: 'markdown' as const, savedText: 'Saved', imported: false },
  text: 'Unsaved work', mode: 'wysiwyg' as const, dirty: true,
  position: { from: 3, to: 3, before: 'Uns', after: 'aved work', scrollTop: 100 },
};
beforeEach(() => localStorage.clear());

test('an unsaved session round-trips its text and reading position', () => {
  expect(writeSession(session)).toBe(true);
  expect(readSession()).toEqual(session);
});
test('corrupt or incomplete recovery records are ignored', () => {
  localStorage.setItem('marginalia.session.v1', '{"version":1,"file":{}}');
  expect(readSession()).toBe(null);
});
test('a modified disk file never silently replaces a recovered draft', () => {
  expect(recoveryDecision(session, 'Changed elsewhere')).toBe('copy');
  expect(recoveryDecision(session, 'Saved')).toBe('draft');
});
test('clean sessions use the current disk content', () => {
  expect(recoveryDecision({ ...session, dirty: false }, 'New disk content')).toBe('disk');
});

