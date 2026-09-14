export interface TextMatch { from: number; to: number }
export function findMatches(text: string, query: string, matchCase = false): TextMatch[] {
  if (!query) return [];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(escaped, matchCase ? 'gu' : 'giu');
  return Array.from(text.matchAll(pattern), match => ({ from: match.index!, to: match.index! + match[0].length }));
}
export function replaceMatches(text: string, matches: TextMatch[], replacement: string): string {
  for (const match of [...matches].reverse()) text = text.slice(0, match.from) + replacement + text.slice(match.to);
  return text;
}
