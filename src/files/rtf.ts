/**
 * Minimal RTF → plain text converter. Handles the common cases well enough
 * for "basic editing" of RTF files: control words, groups, \par newlines,
 * unicode escapes and hex escapes. Formatting is intentionally dropped.
 */
export function rtfToText(rtf: string): string {
  let out = "";
  let i = 0;
  let skipGroupDepth = -1; // depth at which a destination group (fonttbl etc.) started
  let depth = 0;

  const DESTINATIONS = new Set([
    "fonttbl",
    "colortbl",
    "stylesheet",
    "info",
    "pict",
    "header",
    "footer",
    "field",
    "object",
    "themedata",
    "listtable",
    "listoverridetable",
    "generator",
  ]);

  while (i < rtf.length) {
    const ch = rtf[i];
    if (ch === "{") {
      depth++;
      i++;
    } else if (ch === "}") {
      if (skipGroupDepth !== -1 && depth === skipGroupDepth) skipGroupDepth = -1;
      depth--;
      i++;
    } else if (ch === "\\") {
      const rest = rtf.slice(i + 1);
      const cw = /^([a-zA-Z]+)(-?\d+)? ?/.exec(rest);
      if (cw) {
        const word = cw[1];
        const param = cw[2] ? parseInt(cw[2], 10) : undefined;
        i += 1 + cw[0].length;
        if (skipGroupDepth !== -1) continue;
        if (DESTINATIONS.has(word)) {
          skipGroupDepth = depth;
        } else if (word === "par" || word === "line") {
          out += "\n";
        } else if (word === "tab") {
          out += "\t";
        } else if (word === "u" && param !== undefined) {
          out += String.fromCharCode(param < 0 ? param + 65536 : param);
          // Skip the fallback character that follows \uN.
          if (rtf[i] === "?") i++;
        }
      } else if (rest.startsWith("'")) {
        const hex = rest.slice(1, 3);
        if (skipGroupDepth === -1) out += String.fromCharCode(parseInt(hex, 16));
        i += 4;
      } else {
        // Escaped literal: \\ \{ \}
        if (skipGroupDepth === -1 && "\\{}".includes(rtf[i + 1])) out += rtf[i + 1];
        i += 2;
      }
    } else {
      if (skipGroupDepth === -1 && ch !== "\r" && ch !== "\n") out += ch;
      i++;
    }
  }
  return out.trim();
}
