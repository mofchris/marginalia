import { invoke } from "@tauri-apps/api/core";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";

export const MARKDOWN_EXTS = ["md", "markdown", "mdown", "mkd"];
export const IMPORT_EXTS = ["docx", "rtf"];

export function extOf(path: string): string {
  const m = /\.([^./\\]+)$/.exec(path);
  return m ? m[1].toLowerCase() : "";
}

export function baseName(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}

export const readTextFile = (path: string) =>
  invoke<string>("read_text_file", { path });

export const writeTextFile = (path: string, contents: string) =>
  invoke<void>("write_text_file", { path, contents });

export const readBinaryFile = (path: string) =>
  invoke<ArrayBuffer>("read_binary_file", { path });

export const renameFile = (from: string, to: string) =>
  invoke<void>("rename_file", { from, to });

export const cliOpenPath = () => invoke<string | null>("cli_open_path");

/** Directory portion of a path, including its trailing separator. */
export function dirOf(path: string): string {
  const i = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return i < 0 ? "" : path.slice(0, i + 1);
}

export async function pickFileToOpen(): Promise<string | null> {
  const result = await openDialog({
    multiple: false,
    filters: [
      { name: "Markdown", extensions: MARKDOWN_EXTS },
      { name: "Documents", extensions: ["txt", ...IMPORT_EXTS] },
      { name: "All files", extensions: ["*"] },
    ],
  });
  return typeof result === "string" ? result : null;
}

export async function pickSavePath(
  suggestedName: string,
  markdown: boolean,
): Promise<string | null> {
  return saveDialog({
    defaultPath: suggestedName,
    filters: markdown
      ? [
          { name: "Markdown", extensions: ["md"] },
          { name: "All files", extensions: ["*"] },
        ]
      : [
          { name: "Text", extensions: ["txt"] },
          { name: "All files", extensions: ["*"] },
        ],
  });
}
