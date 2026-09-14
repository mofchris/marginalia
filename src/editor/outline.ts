import { parser } from '@lezer/markdown';

/** Parse only when the visible outline requests it; offsets use the source text. */
export function sourceHeadings(text: string): { text: string; level: number; from: number }[] {
  const headings: { text: string; level: number; from: number }[] = [];
  parser.parse(text).iterate({
    enter(node) {
      const heading = /^(?:ATX|Setext)Heading([1-6])$/.exec(node.name);
      if (!heading) return;
      let start = node.from;
      let label = '';
      for (const mark of node.node.getChildren('HeaderMark')) {
        label += text.slice(start, mark.from);
        start = mark.to;
      }
      label += text.slice(start, node.to);
      headings.push({ text: label.trim().replace(/\s+/g, ' '), level: Number(heading[1]), from: node.from });
      return false;
    },
  });
  return headings;
}
