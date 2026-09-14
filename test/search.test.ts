import { expect, test } from 'vitest';
import { findMatches, replaceMatches } from '../src/editor/search';
import { captureTextPosition, locatePosition } from '../src/editor/position';

test('find handles literal punctuation, casing, empty and repeated matches', () => {
  expect(findMatches('A.b a.b Axb', 'a.b')).toEqual([{ from: 0, to: 3 }, { from: 4, to: 7 }]);
  expect(findMatches('A.b a.b', 'a.b', true)).toEqual([{ from: 4, to: 7 }]);
  expect(findMatches('text', '')).toEqual([]);
});
test('replace all treats dollar signs literally and does not re-match inserted text', () => {
  const text = 'cat cat';
  expect(replaceMatches(text, findMatches(text, 'cat'), '$& cat')).toBe('$& cat $& cat');
});
test('caret context maps past heading markers between source and rich text', () => {
  const position = captureTextPosition('A title\nThe middle of the paragraph.', 19, 19);
  expect(locatePosition('# A title\n\nThe middle of the paragraph.', position).from).toBe(22);
});
