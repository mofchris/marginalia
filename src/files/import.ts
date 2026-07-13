import { readBinaryFile, readTextFile } from "./io";

/** docx → markdown via mammoth (lazy-loaded — it's the heaviest dependency). */
export async function importDocx(path: string): Promise<string> {
  const [{ default: mammoth }, buffer] = await Promise.all([
    import("mammoth"),
    readBinaryFile(path),
  ]);
  // convertToMarkdown exists in mammoth's browser bundle but is missing
  // from its type definitions (flagged deprecated upstream, still shipped).
  const convert = (mammoth as unknown as {
    convertToMarkdown(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }>;
  }).convertToMarkdown;
  const result = await convert({ arrayBuffer: buffer });
  return result.value;
}

export async function importRtf(path: string): Promise<string> {
  const [{ rtfToText }, raw] = await Promise.all([
    import("./rtf"),
    readTextFile(path),
  ]);
  return rtfToText(raw);
}
